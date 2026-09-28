-- Quando um evento é auto-cancelado por não atingir o mínimo de
-- participantes, os participantes CONFIRMED que pagaram não eram
-- reembolsados nem notificados — só o organizador recebia uma notificação.
-- Passa a reembolsar (via wallet_credit, mesma função usada no cancelamento
-- manual pelo organizador) e notificar cada participante.
--
-- Reembolsa o valor efetivamente pago (event.price - discount_cents do
-- cupom aplicado, se houver), não o preço cheio do evento — diferente do
-- cancelamento manual em cancelEventAction, que reembolsa o preço cheio
-- mesmo com cupom aplicado (uma inconsistência pré-existente lá, fora do
-- escopo deste fix).

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
          SELECT p.user_id, p.discount_cents
          FROM participations p
          WHERE p.event_id = ev.id AND p.status = 'CONFIRMED'
        LOOP
          refund_amount := ev.price - COALESCE(part.discount_cents, 0);

          IF refund_amount > 0 THEN
            PERFORM wallet_credit(
              p_user_id     => part.user_id,
              p_amount      => refund_amount,
              p_type        => 'REFUND'::wallet_transaction_type,
              p_description => 'Reembolso: ' || ev.title || ' (mínimo não atingido)',
              p_event_id    => ev.id
            );
          END IF;

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

-- Fix-forward imediato (idempotente — não deve encontrar nada agora, já que
-- os 2 eventos presos foram cancelados na migration anterior, mas cobre
-- qualquer PENDING futuro que já esteja abaixo do mínimo neste exato momento)
DO $$
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
      SELECT p.user_id, p.discount_cents
      FROM participations p
      WHERE p.event_id = ev.id AND p.status = 'CONFIRMED'
    LOOP
      refund_amount := ev.price - COALESCE(part.discount_cents, 0);

      IF refund_amount > 0 THEN
        PERFORM wallet_credit(
          p_user_id     => part.user_id,
          p_amount      => refund_amount,
          p_type        => 'REFUND'::wallet_transaction_type,
          p_description => 'Reembolso: ' || ev.title || ' (mínimo não atingido)',
          p_event_id    => ev.id
        );
      END IF;

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
END $$;
