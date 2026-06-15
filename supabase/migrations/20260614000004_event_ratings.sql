CREATE TABLE IF NOT EXISTS event_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_ratings ENABLE ROW LEVEL SECURITY;

-- Participantes confirmados podem criar/editar sua própria avaliação
CREATE POLICY "Confirmed participants can rate" ON event_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM participations
      WHERE event_id = event_ratings.event_id
        AND user_id = auth.uid()
        AND status = 'CONFIRMED'
    )
  );

CREATE POLICY "Users can update own rating" ON event_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Todos podem ler avaliações
CREATE POLICY "Anyone can read ratings" ON event_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can delete own rating" ON event_ratings
  FOR DELETE TO authenticated USING (user_id = auth.uid());
