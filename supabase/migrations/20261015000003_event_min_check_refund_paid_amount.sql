-- Reembolso do job 'event-min-check' pelo valor efetivamente pago.
--
-- Quando um evento é cancelado por não atingir o mínimo, o job devolvia
-- event.price - discount_cents a cada participante confirmado. Isso acertava
-- o cupom, mas creditava o preço cheio a quem nunca pagou (organizador isento,
-- inscrição aprovada sem pagamento) e dependia de discount_cents estar certo.
--
-- Passa a seguir a mesma regra do app (src/lib/refunds.ts): o reembolso é a
-- soma dos pagamentos APPROVED da inscrição, que passam a REFUNDED. Sem
-- pagamento, sem crédito. O resto do job é idêntico ao de 20260928000005.

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
          SELECT p.id, p.user_id
          FROM participations p
          WHERE p.event_id = ev.id AND p.status = 'CONFIRMED'
        LOOP
          -- Devolve o que foi de fato pago: os pagamentos APPROVED da
          -- inscrição, que passam a REFUNDED
          WITH refunded AS (
            UPDATE payments
            SET status = 'REFUNDED'
            WHERE participation_id = part.id AND status = 'APPROVED'
            RETURNING amount
          )
          SELECT COALESCE(SUM(amount), 0) INTO refund_amount FROM refunded;

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
