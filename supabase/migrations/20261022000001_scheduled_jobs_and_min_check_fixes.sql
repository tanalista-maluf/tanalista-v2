-- Rotinas agendadas que existiam no código mas nunca rodavam, e correções
-- na conferência do mínimo de participantes.
--
-- 1. Lembrete 24h antes do evento (/api/cron/reminders) e limpeza das fotos
--    de eventos com mais de 30 dias (/api/cron/photos-cleanup): o pg_cron
--    passa a chamar o site a cada hora / uma vez por dia, com o CRON_SECRET
--    da Vercel. O segredo NÃO fica nesta migration: é gravado à parte em
--    app_config (chave cron_secret). Sem ele, as chamadas não acontecem.
-- 2. Anúncios do marketplace vencem depois dos 30 dias (direto no banco).
-- 3. event-min-check:
--    a) Evento criado ou remarcado com menos de 12h para o início ficava
--       "Aberto" para sempre: o job só pegava quem cruzava a marca de 12h nos
--       últimos 15 minutos. Agora pega todo evento aberto cujo prazo de
--       conferência já passou (o site calcula esse prazo em min-check.ts).
--    b) O aviso "cancelado por não atingir o mínimo" ia para o organizador de
--       QUALQUER evento cancelado, inclusive os que ele mesmo cancelou. Agora
--       só sai para os eventos que o próprio job cancelou.
--    c) Na confirmação, só o organizador era avisado. Agora os inscritos
--       também recebem "Evento confirmado".

-- ── 1. Chamadas ao site ──────────────────────────────────────────────────────

-- No ambiente local, troque por http://host.docker.internal:3000
INSERT INTO app_config (key, value)
VALUES ('site_url', 'https://www.tanalista.app')
ON CONFLICT (key) DO NOTHING;

-- Chama uma rota /api/cron/* do site com o CRON_SECRET. Sem site_url ou sem
-- cron_secret em app_config, não faz nada.
CREATE OR REPLACE FUNCTION call_site_cron(path TEXT, method TEXT DEFAULT 'POST')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base   TEXT;
  secret TEXT;
  hdrs   JSONB;
BEGIN
  SELECT value INTO base   FROM app_config WHERE key = 'site_url';
  SELECT value INTO secret FROM app_config WHERE key = 'cron_secret';
  IF base IS NULL OR secret IS NULL THEN
    RAISE NOTICE 'call_site_cron(%): site_url ou cron_secret ausente em app_config', path;
    RETURN;
  END IF;

  hdrs := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret);

  -- O lembrete manda e-mails um a um: espera até 2 minutos pela resposta
  IF method = 'GET' THEN
    PERFORM net.http_get(url := base || path, headers := hdrs, timeout_milliseconds := 120000);
  ELSE
    PERFORM net.http_post(url := base || path, body := '{}'::jsonb, headers := hdrs, timeout_milliseconds := 120000);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION call_site_cron(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- A rota procura eventos que começam entre 23h e 25h à frente e não repete
-- lembrete já enviado (tabela email_reminders)
SELECT cron.schedule('send-event-reminders', '5 * * * *', $$ SELECT call_site_cron('/api/cron/reminders', 'POST'); $$);

-- 03:30 em Brasília
SELECT cron.schedule('photos-cleanup', '30 6 * * *', $$ SELECT call_site_cron('/api/cron/photos-cleanup', 'GET'); $$);

-- ── 2. Marketplace ───────────────────────────────────────────────────────────

SELECT cron.schedule(
  'marketplace-expire',
  '15 * * * *',
  $$ UPDATE marketplace_listings SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expires_at < now(); $$
);

-- ── 3. Conferência do mínimo ─────────────────────────────────────────────────

SELECT cron.unschedule('event-min-check');

SELECT cron.schedule(
  'event-min-check',
  '*/15 * * * *',
  $$
    -- Abertos cujo prazo de conferência já passou (normalmente T-12h). Eventos
    -- que começaram há mais de 2 horas ficam de fora: já aconteceram.
    UPDATE events
    SET status = 'PENDING'
    WHERE status = 'OPEN'
      AND min_check_at <= now()
      AND starts_at > now() - INTERVAL '2 hours';

    -- Cancelar os PENDING abaixo do mínimo, reembolsando e avisando cada
    -- inscrito e o organizador
    DO $do$
    DECLARE
      ev RECORD;
      part RECORD;
      refund_amount BIGINT;
    BEGIN
      FOR ev IN
        SELECT e.id, e.title, e.price, e.organizer_id
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

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
          ev.organizer_id,
          'EVENT_CANCELLED',
          'Evento cancelado — mínimo não atingido',
          'Seu evento "' || ev.title || '" foi cancelado automaticamente por não atingir o mínimo de participantes.',
          jsonb_build_object('event_id', ev.id)
        );
      END LOOP;
    END
    $do$;

    -- Confirmar os PENDING que atingiram o mínimo (ou não exigem mínimo) e
    -- avisar o organizador e os inscritos
    WITH confirmed AS (
      UPDATE events e
      SET status = 'CONFIRMED'
      WHERE e.status = 'PENDING'
        AND (
          e.min_participants IS NULL
          OR (
            SELECT COUNT(*) FROM participations p
            WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
          ) >= e.min_participants
        )
      RETURNING e.id, e.title, e.organizer_id
    ),
    organizer_notice AS (
      INSERT INTO notifications (user_id, type, title, body, data)
      SELECT
        c.organizer_id,
        'EVENT_CONFIRMED',
        'Evento confirmado!',
        'Seu evento "' || c.title || '" atingiu o mínimo de participantes e foi confirmado.',
        jsonb_build_object('event_id', c.id)
      FROM confirmed c
    )
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      p.user_id,
      'EVENT_CONFIRMED',
      'Evento confirmado',
      '"' || c.title || '" atingiu o mínimo de participantes e vai acontecer.',
      jsonb_build_object('event_id', c.id)
    FROM confirmed c
    JOIN participations p ON p.event_id = c.id AND p.status = 'CONFIRMED'
    WHERE p.user_id <> c.organizer_id;
  $$
);
