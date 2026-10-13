-- Participação em grupo só é criada ou removida pelo servidor (service_role).
--
-- "group_members_insert" só conferia user_id = auth.uid(). Direto pela API,
-- qualquer usuário logado entrava em qualquer grupo, inclusive privado, e
-- com role = 'OWNER' — papel em que o app confia para trocar a logo e
-- remover membros. Entrar (grupo público, convite, pedido aprovado), sair e
-- remover membro passam todos pelas server actions, que gravam via service_role.
--
-- SELECT continua como está.

DROP POLICY IF EXISTS "group_members_insert"      ON group_members;
DROP POLICY IF EXISTS "group_members_delete_self" ON group_members;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON group_members FROM anon, authenticated;

-- O contador de membros é mantido por trigger em group_members. Rodando como o
-- chamador ele dependia da RLS de groups (só o dono atualiza), e a entrada de
-- qualquer outra pessoa não era contada.
ALTER FUNCTION sync_group_member_count() SECURITY DEFINER SET search_path = public;
