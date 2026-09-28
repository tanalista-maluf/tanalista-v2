-- O job 'event-min-check' (migration 20260612000005) transiciona
-- OPEN → PENDING em T-12h, e PENDING → CANCELLED quando o mínimo não é
-- atingido — mas nunca transicionava PENDING → CONFIRMED quando o mínimo
-- É atingido (ou quando o evento não exige mínimo). Além disso, a própria
-- transição PENDING → CANCELLED tinha um bug: comparava contra uma subquery
-- agrupada (INNER JOIN), então eventos com ZERO participantes confirmados
-- nunca apareciam na comparação e nunca eram cancelados. Resultado: eventos
-- ficavam presos em PENDING para sempre, e o job 'event-auto-complete'
-- (que só olha status CONFIRMED) nunca os completava.
--
-- Consolidação: as rotas Next.js /api/cron/auto-complete e /api/cron/min-check
-- nunca são de fato chamadas (vercel.json não tem "crons" configurado) — o
-- pg_cron é quem roda de verdade. Este fix mantém o pg_cron como fonte única
-- da verdade e adiciona as notificações in-app que faltavam nessas transições.
--
-- NÃO reembolsa participantes confirmados de eventos auto-cancelados por
-- mínimo não atingido — isso mexe com saldo de carteira e foi deixado de
-- fora deliberadamente, pra decidir à parte.

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

    -- Cancelar eventos PENDING com participantes abaixo do mínimo
    -- (subquery escalar em vez de INNER JOIN, pra não ignorar eventos com
    -- zero participantes confirmados)
    UPDATE events e
    SET status = 'CANCELLED'
    WHERE e.status = 'PENDING'
      AND e.min_participants IS NOT NULL
      AND (
        SELECT COUNT(*) FROM participations p
        WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
      ) < e.min_participants;

    -- Confirmar eventos PENDING que atingiram o mínimo (ou não exigem mínimo)
    -- — a peça que faltava
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

    -- Notificações in-app pro organizador (mesmo padrão do job de payout)
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

-- Corrige de imediato os eventos já presos em PENDING (não precisa esperar
-- o próximo tick do cron)
UPDATE events e
SET status = 'CANCELLED'
WHERE e.status = 'PENDING'
  AND e.min_participants IS NOT NULL
  AND (
    SELECT COUNT(*) FROM participations p
    WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
  ) < e.min_participants;

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
