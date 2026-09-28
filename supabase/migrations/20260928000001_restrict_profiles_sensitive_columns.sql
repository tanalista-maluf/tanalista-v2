-- RLS é por LINHA, não por coluna: a policy "profiles_select_public"
-- (USING TRUE) deixava cpf, phone, wallet_balance e mp_account_id legíveis
-- por qualquer requisição anon/authenticated via PostgREST, de qualquer
-- linha — não só a do próprio dono. Restringe essas 4 colunas no nível de
-- privilégio (column-level GRANT/REVOKE), mantendo a policy de linha
-- permissiva para as colunas públicas (nome, username, avatar, bio, cidade).
REVOKE SELECT (cpf, phone, wallet_balance, mp_account_id) ON profiles FROM anon, authenticated;
