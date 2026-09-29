-- Permite que organizadores criem cupons válidos apenas para o próprio evento,
-- com quantidade de usos limitada (ex.: liberar a taxa para outros admins de campo).

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupons_event_id ON coupons(event_id) WHERE event_id IS NOT NULL;
