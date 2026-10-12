-- Cupons de grupo: válidos em qualquer evento dentro de um grupo (não só um
-- evento específico), para que "sócios" do campo entrem de graça em
-- qualquer evento que o grupo organizar.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupons_group_id ON coupons(group_id) WHERE group_id IS NOT NULL;

-- Necessário para controlar "1 uso por evento" (em vez de 1 uso na vida do
-- cupom), já que agora o mesmo cupom pode ser usado em vários eventos.
ALTER TABLE coupon_uses
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupon_uses_event_id ON coupon_uses(event_id) WHERE event_id IS NOT NULL;
