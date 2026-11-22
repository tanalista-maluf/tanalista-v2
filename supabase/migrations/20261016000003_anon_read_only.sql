-- O papel anon (requisições sem login) passa a ser somente leitura.
--
-- 20260612000007 já declarava só SELECT para anon, mas no banco remoto os
-- privilégios padrão do Supabase davam INSERT, UPDATE e DELETE em todas as
-- tabelas. Nenhuma policy de escrita passa sem auth.uid(), então não era uma
-- brecha — era uma camada de proteção a menos, e a última diferença de
-- privilégios entre o repo e o banco.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- Tabelas criadas daqui em diante pelas migrations nascem do mesmo jeito
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;
