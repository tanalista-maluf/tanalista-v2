-- Tabela de dead-letter para falhas de processamento de webhooks, já
-- referenciada pelo código (src/app/api/webhooks/mercadopago/route.ts) mas
-- nunca criada — todo erro de processamento vinha sendo descartado
-- silenciosamente (só console.error, sem persistência).
CREATE TABLE IF NOT EXISTS webhook_failures (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload    JSONB,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_created_at ON webhook_failures(created_at DESC);

ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
-- Sem policies para anon/authenticated: só service_role (usado pelo webhook handler) acessa.
