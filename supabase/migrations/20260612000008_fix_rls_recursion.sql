-- Corrige recursão infinita entre policies de groups e group_members
-- A causa: groups_select → group_members → group_members_select → groups → loop

-- Função auxiliar SECURITY DEFINER: verifica membership sem acionar RLS
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_group_owner(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
$$;

-- Recriar policy de groups usando a função auxiliar
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select"
  ON groups FOR SELECT
  USING (
    visibility = 'PUBLIC'
    OR owner_id = auth.uid()
    OR is_group_member(id, auth.uid())
  );

-- Recriar policy de group_members sem referenciar groups (usa função auxiliar)
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_group_owner(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.visibility = 'PUBLIC'
    )
  );

DROP POLICY IF EXISTS "group_members_delete_self" ON group_members;
CREATE POLICY "group_members_delete_self"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_group_owner(group_id, auth.uid())
  );
