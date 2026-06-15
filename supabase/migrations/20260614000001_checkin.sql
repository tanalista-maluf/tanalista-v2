-- Adiciona campo de check-in nas participações
ALTER TABLE participations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Index para buscar participações pelo ID no check-in (já tem PK, mas explicitamos)
CREATE INDEX IF NOT EXISTS idx_participations_checkin
  ON participations(id)
  WHERE checked_in_at IS NULL AND status = 'CONFIRMED';
