-- ── Times de eventos (apenas categoria Esportes) ─────────────────────────────

CREATE TABLE event_teams (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  capacity   INT         NOT NULL CHECK (capacity > 0),
  position   INT         NOT NULL DEFAULT 0, -- ordem de exibição
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, name)
);

CREATE INDEX event_teams_event_id_idx ON event_teams(event_id);

ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams are viewable by anyone"
  ON event_teams FOR SELECT USING (true);

CREATE POLICY "organizer can manage teams"
  ON event_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid()
    )
  );

-- ── Adiciona team_id em participations ────────────────────────────────────────

ALTER TABLE participations
  ADD COLUMN IF NOT EXISTS team_id           UUID REFERENCES event_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_changes_used INT  NOT NULL DEFAULT 0; -- max 1 troca permitida

-- ── Adiciona team_id em waitlist_entries ──────────────────────────────────────
-- Remove UNIQUE (event_id, user_id) para permitir troca de fila entre times
-- Recria com team_id incluído

ALTER TABLE waitlist_entries
  DROP CONSTRAINT IF EXISTS waitlist_entries_event_id_user_id_key,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES event_teams(id) ON DELETE CASCADE;

-- Nova unique: um usuário só pode estar em UMA fila por evento
-- (não pode estar em fila do Time A e Time B ao mesmo tempo)
ALTER TABLE waitlist_entries
  ADD CONSTRAINT waitlist_entries_event_user_unique UNIQUE (event_id, user_id);

-- ── Função: contagem de confirmados por time ──────────────────────────────────

CREATE OR REPLACE FUNCTION team_confirmed_count(p_team_id UUID)
RETURNS INT
LANGUAGE sql STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM participations
  WHERE team_id = p_team_id
    AND status = 'CONFIRMED';
$$;
