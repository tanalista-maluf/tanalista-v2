-- Avaliações: só participante confirmado do evento pode criar ou editar.
--
-- A policy "Participantes podem avaliar" (criada direto no banco, FOR ALL,
-- só auth.uid() = user_id) é permissiva e por isso anulava a checagem de
-- participação confirmada de "Confirmed participants can rate": policies
-- permissivas se somam com OR. Além disso, "Users can update own rating"
-- não tinha WITH CHECK próprio, então quem já tinha uma avaliação podia
-- movê-la para outro evento trocando o event_id.

DROP POLICY IF EXISTS "Participantes podem avaliar" ON event_ratings;

DROP POLICY IF EXISTS "Confirmed participants can rate" ON event_ratings;
CREATE POLICY "Confirmed participants can rate" ON event_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM participations
      WHERE participations.event_id = event_ratings.event_id
        AND participations.user_id = auth.uid()
        AND participations.status = 'CONFIRMED'
    )
  );

DROP POLICY IF EXISTS "Users can update own rating" ON event_ratings;
CREATE POLICY "Users can update own rating" ON event_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM participations
      WHERE participations.event_id = event_ratings.event_id
        AND participations.user_id = auth.uid()
        AND participations.status = 'CONFIRMED'
    )
  );
