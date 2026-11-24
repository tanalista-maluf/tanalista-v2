-- Mensagem opcional mostrada ao participante assim que a inscrição é
-- confirmada (regras, orientações, como chegar, etc). Pode ser texto,
-- imagem, ou os dois. Desativada por padrão; o organizador ativa e
-- preenche na edição do evento.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS post_signup_message_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_signup_message TEXT
    CHECK (char_length(post_signup_message) <= 500),
  ADD COLUMN IF NOT EXISTS post_signup_message_image_url TEXT;

-- Mesmo padrão de grants por coluna de 20261012000003_events_column_grants.sql:
-- toda coluna nova em events nasce sem acesso pra anon/authenticated.
GRANT SELECT (post_signup_message_enabled, post_signup_message, post_signup_message_image_url) ON events TO anon, authenticated;
GRANT INSERT (post_signup_message_enabled, post_signup_message, post_signup_message_image_url) ON events TO authenticated;
GRANT UPDATE (post_signup_message_enabled, post_signup_message, post_signup_message_image_url) ON events TO authenticated;
