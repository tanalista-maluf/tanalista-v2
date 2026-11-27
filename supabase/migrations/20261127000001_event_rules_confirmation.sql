-- Confirmação de leitura das regras/diretrizes antes de se inscrever.
--
-- O organizador pode exigir que o participante marque "Li e concordo com as
-- diretrizes" antes do botão de inscrição ficar ativo. A regra em si usa a
-- coluna custom_rules já existente (20260621000001); aqui só sobe o limite
-- de 2.000 para 8.000 caracteres (a UI permitia 2.000, sem CHECK no banco)
-- e adiciona o booleano que ativa/desativa a obrigatoriedade.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rules_confirmation_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_custom_rules_check;
ALTER TABLE events
  ADD CONSTRAINT events_custom_rules_check CHECK (char_length(custom_rules) <= 8000);

-- Mesmo padrão de grants por coluna de 20261012000003_events_column_grants.sql:
-- toda coluna nova em events nasce sem acesso pra anon/authenticated. custom_rules
-- já tinha SELECT (migration original), mas nunca ganhou INSERT/UPDATE — por isso
-- updateEventRulesAction gravava via admin client. Agora os dois campos passam
-- a ser preenchidos direto no formulário de criação/edição do evento.
GRANT SELECT (custom_rules, rules_confirmation_required) ON events TO anon, authenticated;
GRANT INSERT (custom_rules, rules_confirmation_required) ON events TO authenticated;
GRANT UPDATE (custom_rules, rules_confirmation_required) ON events TO authenticated;
