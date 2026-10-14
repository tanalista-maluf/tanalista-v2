-- Aparelhos que recebem notificação push: o token Expo de cada instalação do
-- app, ligado à pessoa logada nela. O servidor envia pelo serviço de push da
-- Expo (que entrega pelo APNs no iOS e pelo FCM no Android) sempre que cria
-- uma notificação, se profiles.notif_push estiver ligado.
--
-- Só o servidor (service_role) lê e grava: o app registra o token pela API.

CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_tokens FROM anon, authenticated;
GRANT ALL ON push_tokens TO service_role;
