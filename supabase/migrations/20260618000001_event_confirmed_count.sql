-- Adiciona confirmed_count denormalizado em events para exibição pública
-- sem depender de RLS da tabela participations.

ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmed_count INTEGER NOT NULL DEFAULT 0;

-- Backfill a partir das participações existentes
UPDATE events e
SET confirmed_count = (
  SELECT COUNT(*) FROM participations p
  WHERE p.event_id = e.id AND p.status = 'CONFIRMED'
);

-- Trigger para manter confirmed_count atualizado
CREATE OR REPLACE FUNCTION update_event_confirmed_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'CONFIRMED' THEN
      UPDATE events SET confirmed_count = confirmed_count + 1 WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'CONFIRMED' THEN
      UPDATE events SET confirmed_count = GREATEST(0, confirmed_count - 1) WHERE id = OLD.event_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'CONFIRMED' AND NEW.status = 'CONFIRMED' THEN
      UPDATE events SET confirmed_count = confirmed_count + 1 WHERE id = NEW.event_id;
    ELSIF OLD.status = 'CONFIRMED' AND NEW.status != 'CONFIRMED' THEN
      UPDATE events SET confirmed_count = GREATEST(0, confirmed_count - 1) WHERE id = OLD.event_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_confirmed_count ON participations;
CREATE TRIGGER trg_event_confirmed_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON participations
  FOR EACH ROW EXECUTE FUNCTION update_event_confirmed_count();
