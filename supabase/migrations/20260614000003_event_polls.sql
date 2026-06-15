CREATE TABLE event_polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question   TEXT        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  closes_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_poll_options (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  UUID    NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
  text     TEXT    NOT NULL CHECK (char_length(text) BETWEEN 1 AND 100),
  position SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE event_poll_votes (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID        NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
  option_id UUID        NOT NULL REFERENCES event_poll_options(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)   -- um voto por pessoa por enquete
);

CREATE INDEX idx_polls_event      ON event_polls(event_id, created_at DESC);
CREATE INDEX idx_poll_options     ON event_poll_options(poll_id, position);
CREATE INDEX idx_poll_votes_poll  ON event_poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user  ON event_poll_votes(poll_id, user_id);

-- RLS
ALTER TABLE event_polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_poll_votes   ENABLE ROW LEVEL SECURITY;

-- Participantes confirmados e organizador podem ver enquetes
CREATE POLICY "polls_select" ON event_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_polls.event_id
        AND (e.organizer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM participations p
                     WHERE p.event_id = e.id AND p.user_id = auth.uid() AND p.status = 'CONFIRMED'))
    )
  );

-- Só organizador cria enquetes
CREATE POLICY "polls_insert" ON event_polls FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_polls.event_id AND e.organizer_id = auth.uid())
  );

-- Só organizador deleta
CREATE POLICY "polls_delete" ON event_polls FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_polls.event_id AND e.organizer_id = auth.uid())
  );

-- Opções: mesmas regras que a enquete pai
CREATE POLICY "poll_options_select" ON event_poll_options FOR SELECT USING (true);
CREATE POLICY "poll_options_insert" ON event_poll_options FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM event_polls ep
            JOIN events e ON e.id = ep.event_id
            WHERE ep.id = event_poll_options.poll_id AND e.organizer_id = auth.uid())
  );
CREATE POLICY "poll_options_delete" ON event_poll_options FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM event_polls ep
            JOIN events e ON e.id = ep.event_id
            WHERE ep.id = event_poll_options.poll_id AND e.organizer_id = auth.uid())
  );

-- Votos: participantes confirmados votam, todos veem
CREATE POLICY "poll_votes_select" ON event_poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes_insert" ON event_poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM event_polls ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.id = event_poll_votes.poll_id
        AND (e.organizer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM participations p
                     WHERE p.event_id = e.id AND p.user_id = auth.uid() AND p.status = 'CONFIRMED'))
        AND (ep.closes_at IS NULL OR ep.closes_at > now())
    )
  );
CREATE POLICY "poll_votes_delete" ON event_poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE event_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE event_poll_votes;
