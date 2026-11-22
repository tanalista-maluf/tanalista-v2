-- Fecha de verdade a exposição de colunas sensíveis de profiles.
--
-- 20260928000001 tentou isso com REVOKE SELECT (cpf, ...) por coluna, mas
-- anon e authenticated têm privilégio na tabela inteira, e no Postgres um
-- REVOKE de coluna não tira nada de um GRANT de tabela. Resultado: com a
-- policy "profiles_select_public" (USING true), qualquer requisição à API
-- lia cpf, phone, wallet_balance e mp_account_id de qualquer usuário. E com
-- "profiles_update_own" + UPDATE na tabela, o usuário logado podia alterar
-- o próprio wallet_balance direto pela API.
--
-- Agora o privilégio de tabela é removido e só as colunas públicas ganham
-- SELECT. Nenhum INSERT/UPDATE/DELETE fica disponível para anon ou
-- authenticated: todas as escritas em profiles passam pelo service_role
-- (server actions) ou pelo trigger handle_new_user (SECURITY DEFINER).
--
-- Efeito colateral intencional: toda coluna nova em profiles nasce privada
-- e precisa de GRANT explícito para ser lida com a anon key.

REVOKE ALL ON profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  username,
  avatar_url,
  bio,
  city,
  onboarding_completed,
  created_at
) ON profiles TO anon, authenticated;
