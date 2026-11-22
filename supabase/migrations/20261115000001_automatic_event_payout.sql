-- O repasse ao organizador nunca foi automático de verdade: o job
-- 'payout-processor' (migration 0005) só mandava uma notificação "sendo
-- processado" e dependia de uma Edge Function que nunca foi criada — por
-- isso foi removido em 20261014000002, deixando o resgate 100% manual
-- (botão "Resgatar receita"). Esta migration implementa o repasse
-- automático de verdade, disparado no horário de TÉRMINO do evento
-- (ends_at), que passa a ser obrigatório — até aqui era opcional, então
-- 'event-auto-complete' usava um palpite (2h depois do início) pra decidir
-- quando o evento tinha acabado.

-- ── ends_at passa a ser obrigatório ──────────────────────────────────────
-- Eventos antigos sem término preenchido ganham início + 4h (mesma folga
-- usada em outros lugares do app, ex. AddToCalendar, pro evento sem duração
-- informada).
UPDATE events SET ends_at = starts_at + INTERVAL '4 hours' WHERE ends_at IS NULL;
ALTER TABLE events ALTER COLUMN ends_at SET NOT NULL;

-- ── 'event-auto-complete' passa a usar o término real, não o palpite ────
SELECT cron.unschedule('event-auto-complete');

SELECT cron.schedule(
  'event-auto-complete',
  '0 * * * *',
  $$
    UPDATE events
    SET status = 'COMPLETED'
    WHERE status = 'CONFIRMED'
      AND ends_at < now();
  $$
);

-- ── Repasse automático ───────────────────────────────────────────────────
-- Mesmo cálculo de receita líquida do resgate manual (claimEventPayoutAction
-- em features/financeiro/actions.ts): soma pagamentos aprovados das
-- participações confirmadas, desconta taxas da plataforma e do gateway.
-- payout_claimed_at é travado com um UPDATE condicional antes de creditar —
-- se o organizador já tiver resgatado manualmente entre a leitura e esta
-- trava, o UPDATE não afeta nenhuma linha e o evento é pulado, sem duplicar
-- crédito. Evento sem receita (gratuito, só cupom/isenção) nunca é marcado:
-- fica disponível pro resgate manual perceber "nada a resgatar" sem erro.
CREATE OR REPLACE FUNCTION process_event_payouts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  gross BIGINT;
  platform_fees BIGINT;
  gateway_fees BIGINT;
  net BIGINT;
  claimed_rows INT;
BEGIN
  FOR ev IN
    SELECT id, title, organizer_id
    FROM events
    WHERE status = 'COMPLETED'
      AND payout_claimed_at IS NULL
      -- Janela de segurança: não varre o histórico inteiro a cada execução
      AND ends_at > now() - INTERVAL '7 days'
  LOOP
    SELECT
      COALESCE(SUM(p.amount), 0),
      COALESCE(SUM(p.platform_fee), 0),
      COALESCE(SUM(p.gateway_fee), 0)
    INTO gross, platform_fees, gateway_fees
    FROM payments p
    JOIN participations part ON part.id = p.participation_id
    WHERE part.event_id = ev.id
      AND part.status = 'CONFIRMED'
      AND p.status = 'APPROVED';

    net := gross - platform_fees - gateway_fees;
    IF net <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE events SET payout_claimed_at = now()
    WHERE id = ev.id AND payout_claimed_at IS NULL;
    GET DIAGNOSTICS claimed_rows = ROW_COUNT;
    IF claimed_rows = 0 THEN
      CONTINUE; -- resgatado manualmente entre a leitura e a trava acima
    END IF;

    PERFORM wallet_credit(
      p_user_id := ev.organizer_id,
      p_amount := net,
      p_type := 'PAYOUT',
      p_description := 'Receita do evento: ' || ev.title,
      p_event_id := ev.id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION process_event_payouts() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'event-payout',
  '*/15 * * * *',
  $$ SELECT process_event_payouts(); $$
);
