-- Push para toda notificação, inclusive as criadas pelo próprio banco.
--
-- Os avisos gerados em SQL (jobs do pg_cron como event-min-check, funções de
-- reembolso etc.) só apareciam no sino: o push saía apenas do código do site
-- (createNotificationAdmin). Agora cada linha nova em notifications avisa o
-- site por HTTP (pg_net), e o site manda o push ao app e ao navegador.
--
-- O endpoint só recebe o id. Quem envia de fato "reivindica" a notificação
-- marcando pushed_at (só vale para quem ainda não foi enviada, nos primeiros
-- 15 minutos), então o push sai uma única vez mesmo que o site e o gatilho
-- tentem ao mesmo tempo, e chamar o endpoint de fora não reenvia nada.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE notifications ADD COLUMN pushed_at TIMESTAMPTZ;

-- Configuração que o banco precisa e que muda por ambiente. Sem acesso pela API.
CREATE TABLE app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_config FROM anon, authenticated;

-- No ambiente local, troque por http://host.docker.internal:3000/api/notificacoes/push
INSERT INTO app_config (key, value)
VALUES ('push_webhook_url', 'https://www.tanalista.app/api/notificacoes/push');

CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target TEXT;
BEGIN
  SELECT value INTO target FROM app_config WHERE key = 'push_webhook_url';
  IF target IS NULL THEN
    RETURN NEW;
  END IF;

  -- O pg_net só dispara depois do commit, e uma falha aqui nunca pode
  -- impedir a notificação de ser gravada
  BEGIN
    PERFORM net.http_post(
      url := target,
      body := jsonb_build_object('id', NEW.id),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push da notificação % não agendado: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION notify_push_on_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notifications_push
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_push_on_insert();
