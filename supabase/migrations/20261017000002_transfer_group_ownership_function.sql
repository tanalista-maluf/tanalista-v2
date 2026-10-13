-- Transferência de posse de um grupo numa transação só.
--
-- A ação do app promovia o novo dono e rebaixava o antigo em duas chamadas
-- paralelas, gravava para o antigo um papel que a tabela não aceita ('ADMIN';
-- group_members.role só admite OWNER e MEMBER) e nunca atualizava
-- groups.owner_id — a coluna que a RLS e o resto do app usam para decidir quem
-- é o dono. O resultado era um erro para o usuário com dois OWNER em
-- group_members e o dono real inalterado.
--
-- SECURITY INVOKER e sem EXECUTE para anon/authenticated: só o service_role a
-- chama, depois de a server action conferir que quem pede é o dono atual.
CREATE OR REPLACE FUNCTION transfer_group_ownership(
  p_group_id      UUID,
  p_current_owner UUID,
  p_new_owner     UUID
) RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_current_owner = p_new_owner THEN
    RAISE EXCEPTION 'O novo dono já é o dono do grupo';
  END IF;

  UPDATE groups SET owner_id = p_new_owner
  WHERE id = p_group_id AND owner_id = p_current_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grupo % não pertence a %', p_group_id, p_current_owner;
  END IF;

  UPDATE group_members SET role = 'OWNER'
  WHERE group_id = p_group_id AND user_id = p_new_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O novo dono não é membro do grupo %', p_group_id;
  END IF;

  UPDATE group_members SET role = 'MEMBER'
  WHERE group_id = p_group_id AND user_id = p_current_owner;
END;
$$;

REVOKE ALL ON FUNCTION transfer_group_ownership(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION transfer_group_ownership(UUID, UUID, UUID) TO service_role;
