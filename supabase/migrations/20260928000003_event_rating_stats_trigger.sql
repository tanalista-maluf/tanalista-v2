-- rating_average e rating_count eram recalculados só no código da aplicação
-- (submitRatingAction), sem garantia de consistência se a atualização falhasse
-- no meio do caminho. Mesmo padrão do trigger de confirmed_count.
CREATE OR REPLACE FUNCTION update_event_rating_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_event_id UUID := COALESCE(NEW.event_id, OLD.event_id);
BEGIN
  UPDATE events e
  SET rating_average = sub.avg_rating,
      rating_count   = sub.cnt
  FROM (
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS cnt
    FROM event_ratings
    WHERE event_id = target_event_id
  ) sub
  WHERE e.id = target_event_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_rating_stats ON event_ratings;
CREATE TRIGGER trg_event_rating_stats
  AFTER INSERT OR UPDATE OF rating OR DELETE ON event_ratings
  FOR EACH ROW EXECUTE FUNCTION update_event_rating_stats();
