CREATE TABLE event_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_comments_event ON event_comments(event_id, created_at DESC);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Participantes confirmados e organizador podem ler
CREATE POLICY "comments_select"
  ON event_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_comments.event_id
        AND (
          e.organizer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM participations p
            WHERE p.event_id = e.id
              AND p.user_id = auth.uid()
              AND p.status = 'CONFIRMED'
          )
        )
    )
  );

-- Participantes confirmados e organizador podem comentar
CREATE POLICY "comments_insert"
  ON event_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_comments.event_id
        AND (
          e.organizer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM participations p
            WHERE p.event_id = e.id
              AND p.user_id = auth.uid()
              AND p.status = 'CONFIRMED'
          )
        )
    )
  );

-- Só o autor ou organizador podem deletar
CREATE POLICY "comments_delete"
  ON event_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_comments.event_id
        AND e.organizer_id = auth.uid()
    )
  );

-- Realtime: habilitar para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE event_comments;
