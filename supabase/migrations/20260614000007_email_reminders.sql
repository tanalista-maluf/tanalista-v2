-- Tabela para rastrear lembretes enviados
CREATE TABLE IF NOT EXISTS email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '24h', '1h', etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, reminder_type)
);

ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Apenas o service_role (backend) acessa esta tabela
-- Usuários comuns não têm acesso direto
