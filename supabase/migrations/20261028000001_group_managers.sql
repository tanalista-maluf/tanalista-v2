-- Gestores de grupo e quem pode criar eventos num grupo.
--
-- Até aqui qualquer membro criava eventos no grupo. Agora só o dono e os
-- membros que ele promove a Gestor (role = 'MANAGER'). O Gestor edita os
-- próprios eventos; o dono edita e cancela qualquer evento do grupo.
-- Promover e rebaixar passam pelo servidor (service_role), como as demais
-- escritas em group_members.

ALTER TABLE group_members DROP CONSTRAINT group_members_role_check;
ALTER TABLE group_members ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('OWNER', 'MANAGER', 'MEMBER'));

-- Criar evento em grupo: só dono e Gestores. Evento avulso continua livre.
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organizer_id = auth.uid()
    AND (
      group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = events.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN ('OWNER', 'MANAGER')
      )
    )
  );

-- O dono do grupo edita os eventos publicados do grupo. As colunas que o
-- authenticated pode atualizar já excluem organizer_id, group_id e status:
-- o dono corrige o evento, mas não o toma para si nem o muda de grupo.
CREATE POLICY "events_update_group_owner"
  ON events FOR UPDATE
  USING (
    status <> 'DRAFT'
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'OWNER'
    )
  );

-- Aviso a quem o dono promove a Gestor ou volta a membro
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_ROLE_CHANGED';
