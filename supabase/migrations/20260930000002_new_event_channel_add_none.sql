-- Adiciona a opção "Nenhum" ao canal de notificação de novos eventos de grupo.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_notif_new_event_channel_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_notif_new_event_channel_check
  CHECK (notif_new_event_channel IN ('EMAIL', 'WHATSAPP', 'NONE'));
