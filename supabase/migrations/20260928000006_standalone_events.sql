-- Permite eventos "soltos", sem grupo — apenas para inscrição, sem exigir
-- que o organizador crie/participe de um grupo primeiro.
ALTER TABLE events ALTER COLUMN group_id DROP NOT NULL;

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
        WHERE gm.group_id = events.group_id AND gm.user_id = auth.uid()
      )
    )
  );
