-- Preferência de canal para notificações de novos eventos nos grupos que a
-- pessoa participa: e-mail (já implementado) ou WhatsApp (futuro).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_new_event_channel TEXT NOT NULL DEFAULT 'EMAIL'
    CHECK (notif_new_event_channel IN ('EMAIL', 'WHATSAPP'));
