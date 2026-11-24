-- Duas notificações que o criador do evento pode desativar: aviso ao grupo
-- quando o evento é publicado, e aviso a ele mesmo a cada nova inscrição
-- confirmada. Default ligado (comportamento atual).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS notify_group_on_create     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_organizer_on_signup BOOLEAN NOT NULL DEFAULT true;

-- Mesmo padrão de grants por coluna de 20261012000003_events_column_grants.sql:
-- toda coluna nova em events nasce sem acesso pra anon/authenticated.
GRANT SELECT (notify_group_on_create, notify_organizer_on_signup) ON events TO anon, authenticated;
GRANT INSERT (notify_group_on_create, notify_organizer_on_signup) ON events TO authenticated;
GRANT UPDATE (notify_group_on_create, notify_organizer_on_signup) ON events TO authenticated;

-- Notifica o organizador quando alguém confirma inscrição no evento.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_PARTICIPANT';
