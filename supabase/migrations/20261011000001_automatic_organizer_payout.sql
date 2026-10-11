-- O repasse ao organizador hoje é 100% manual (claimEventPayoutAction, botão
-- "Resgatar receita" em /financeiro) e o job 'payout-processor' que deveria
-- processá-lo automaticamente só envia uma notificação dizendo que "está
-- sendo processado" sem creditar nada de verdade (dependia de uma Edge
-- Function que nunca foi criada). Resultado: repasses ficam parados até o
-- organizador descobrir e clicar manualmente.
--
-- Substitui isso por crédito automático: o job que já marca eventos como
-- COMPLETED (de hora em hora) passa também a varrer eventos concluídos e
-- ainda não resgatados (payout_claimed_at IS NULL) e creditar a receita
-- líquida na carteira do organizador, cobrindo tanto os que acabaram de
-- completar quanto qualquer evento concluído anteriormente ainda pendente.

SELECT cron.unschedule('payout-processor');
SELECT cron.unschedule('event-auto-complete');

SELECT cron.schedule(
  'event-auto-complete',
  '0 * * * *',
  $$
    DO $do$
    DECLARE
      ev RECORD;
      v_net BIGINT;
    BEGIN
      -- Marca eventos como concluídos
      UPDATE events
      SET status = 'COMPLETED'
      WHERE status = 'CONFIRMED'
        AND starts_at < now() - INTERVAL '2 hours';

      -- Credita automaticamente o repasse de todo evento concluído ainda
      -- não resgatado
      FOR ev IN
        SELECT e.id, e.title, e.organizer_id
        FROM events e
        WHERE e.status = 'COMPLETED'
          AND e.payout_claimed_at IS NULL
      LOOP
        SELECT COALESCE(SUM(p.amount - p.platform_fee - p.gateway_fee), 0)
        INTO v_net
        FROM payments p
        JOIN participations pt ON pt.id = p.participation_id
        WHERE pt.event_id = ev.id
          AND pt.status = 'CONFIRMED'
          AND p.status = 'APPROVED';

        IF v_net > 0 THEN
          PERFORM wallet_credit(
            ev.organizer_id,
            v_net,
            'PAYOUT'::wallet_transaction_type,
            'Receita do evento: ' || ev.title,
            NULL,
            ev.id
          );
        END IF;

        UPDATE events SET payout_claimed_at = now() WHERE id = ev.id;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
          ev.organizer_id,
          'PAYOUT_PROCESSED',
          'Repasse creditado na carteira',
          'O repasse do seu evento "' || ev.title || '" foi creditado na sua carteira TáNaLista.',
          jsonb_build_object('event_id', ev.id)
        );
      END LOOP;
    END;
    $do$;
  $$
);
