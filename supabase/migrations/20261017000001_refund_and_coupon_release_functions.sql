-- Estorno e devolução de cupom como funções do banco, usadas pelo app e pelo
-- job 'event-min-check'.
--
-- A regra de reembolso existia em dois lugares (src/lib/refunds.ts e o job do
-- cron) e, no app, marcar os pagamentos como REFUNDED e creditar a carteira
-- eram duas chamadas separadas: uma falha entre elas deixava o pagamento
-- estornado sem crédito. Além disso o job não devolvia o cupom, ao contrário
-- do cancelamento manual do evento.
--
-- Cada função roda numa transação só. São SECURITY INVOKER e sem EXECUTE para
-- anon/authenticated: só o service_role e o pg_cron as chamam.

-- Estorna para a carteira o que foi de fato pago por uma inscrição: a soma dos
-- pagamentos APPROVED dela, que passam a REFUNDED. Devolve o valor creditado
-- (0 se nada foi pago). Qualquer erro desfaz tudo.
CREATE OR REPLACE FUNCTION refund_participation_payments(
  p_participation_id UUID,
  p_user_id          UUID,
  p_event_id         UUID,
  p_description      TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_amount BIGINT;
BEGIN
  WITH refunded AS (
    UPDATE payments
    SET status = 'REFUNDED'
    WHERE participation_id = p_participation_id AND status = 'APPROVED'
    RETURNING amount
  )
  SELECT COALESCE(SUM(amount), 0) INTO v_amount FROM refunded;

  IF v_amount > 0 THEN
    PERFORM wallet_credit(
      p_user_id     => p_user_id,
      p_amount      => v_amount,
      p_type        => 'REFUND'::wallet_transaction_type,
      p_description => p_description,
      p_event_id    => p_event_id
    );
  END IF;

  RETURN v_amount;
END;
$$;

-- Devolve o uso de um cupom por um usuário num evento e decrementa uses_count.
-- Usos de cupom de evento anteriores a coupon_uses.event_id não têm evento, e
-- servem de alternativa quando não há uso registrado para o evento. Diz se
-- havia um uso para devolver.
CREATE OR REPLACE FUNCTION release_coupon_use(
  p_coupon_id UUID,
  p_user_id   UUID,
  p_event_id  UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_use_id UUID;
BEGIN
  IF p_coupon_id IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_use_id
  FROM coupon_uses
  WHERE coupon_id = p_coupon_id
    AND user_id = p_user_id
    AND (event_id = p_event_id OR event_id IS NULL)
  ORDER BY (event_id IS NULL)  -- o uso deste evento primeiro
  LIMIT 1
  FOR UPDATE;

  IF v_use_id IS NULL THEN RETURN false; END IF;

  DELETE FROM coupon_uses WHERE id = v_use_id;
  UPDATE coupons SET uses_count = GREATEST(0, uses_count - 1) WHERE id = p_coupon_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION refund_participation_payments(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_coupon_use(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_participation_payments(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION release_coupon_use(UUID, UUID, UUID) TO service_role;

-- O job passa a chamar as duas funções. O resto é idêntico ao de 20261015000003.
SELECT cron.unschedule('event-min-check');

SELECT cron.schedule(
  'event-min-check',
  '*/15 * * * *',
  $$
    -- Marcar como PENDING eventos que chegaram em T-12h e estão OPEN
    UPDATE events
    SET status = 'PENDING'
    WHERE status = 'OPEN'
      AND min_check_at <= now()
      AND min_check_at > now() - INTERVAL '15 minutes';

    -- Cancelar eventos PENDING abaixo do mínimo, reembolsando e notificando
    -- cada participante confirmado
    DO $do$
    DECLARE
      ev RECORD;
      part RECORD;
      refund_amount BIGINT;
    BEGIN
      FOR ev IN
        SELECT e.id, e.title, e.price
        FROM events e
        WHERE e.status = 'PENDING'
          AND e.min_participants IS NOT NULL
          AND (
            SELECT COUNT(*) FROM participations p
            WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
          ) < e.min_participants
      LOOP
        FOR part IN
          SELECT p.id, p.user_id, p.coupon_id
          FROM participations p
          WHERE p.event_id = ev.id AND p.status = 'CONFIRMED'
        LOOP
          -- Mesmas funções que o app usa no cancelamento manual
          refund_amount := refund_participation_payments(
            part.id, part.user_id, ev.id,
            'Reembolso: ' || ev.title || ' (mínimo não atingido)'
          );
          PERFORM release_coupon_use(part.coupon_id, part.user_id, ev.id);

          INSERT INTO notifications (user_id, type, title, body, data)
          VALUES (
            part.user_id,
            'EVENT_CANCELLED',
            'Evento cancelado',
            '"' || ev.title || '" foi cancelado por não atingir o mínimo de participantes.'
              || CASE WHEN refund_amount > 0 THEN ' Seu pagamento foi estornado para a carteira.' ELSE '' END,
            jsonb_build_object('event_id', ev.id)
          );
        END LOOP;

        UPDATE events SET status = 'CANCELLED' WHERE id = ev.id;
      END LOOP;
    END
    $do$;

    -- Confirmar eventos PENDING que atingiram o mínimo (ou não exigem mínimo)
    UPDATE events e
    SET status = 'CONFIRMED'
    WHERE e.status = 'PENDING'
      AND (
        e.min_participants IS NULL
        OR (
          SELECT COUNT(*) FROM participations p
          WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
        ) >= e.min_participants
      );

    -- Notificação in-app pro organizador nas duas transições
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      e.organizer_id,
      'EVENT_CONFIRMED',
      'Evento confirmado!',
      'Seu evento "' || e.title || '" atingiu o mínimo de participantes e foi confirmado.',
      jsonb_build_object('event_id', e.id)
    FROM events e
    WHERE e.status = 'CONFIRMED'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = e.organizer_id AND n.type = 'EVENT_CONFIRMED'
          AND (n.data->>'event_id')::uuid = e.id
      );

    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      e.organizer_id,
      'EVENT_CANCELLED',
      'Evento cancelado — mínimo não atingido',
      'Seu evento "' || e.title || '" foi cancelado automaticamente por não atingir o mínimo de participantes.',
      jsonb_build_object('event_id', e.id)
    FROM events e
    WHERE e.status = 'CANCELLED'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = e.organizer_id AND n.type = 'EVENT_CANCELLED'
          AND (n.data->>'event_id')::uuid = e.id
      );
  $$
);
