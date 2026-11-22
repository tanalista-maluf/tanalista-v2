-- Backfill de schema que já existe no banco remoto mas nunca foi versionado.
--
-- Estes objetos foram criados direto no banco (SQL editor/dashboard) entre
-- 15 e 17/06/2026, junto com as features de cupons, saques, galeria e
-- marketplace, e o SQL nunca entrou no repo. O DDL abaixo foi copiado do
-- dump do projeto remoto, não reconstruído a partir do código.
--
-- É idempotente e, no banco remoto, não deve ser executado: apenas
-- registrado como aplicado (supabase migration repair --status applied).
-- O timestamp é anterior às migrations que dependem destes objetos
-- (20260619000002 usa events.visibility, 20260619000003 usa events.slug,
-- 20260929000001 altera coupons), para que a cadeia rode num banco vazio.
--
-- coupons.event_id e coupons.percent_off ficam de fora de propósito: são
-- adicionadas por 20260929000001 e 20261005000001.

-- ── Enum ─────────────────────────────────────────────────────────────────────
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'BONUS';

-- ── Colunas em tabelas existentes ────────────────────────────────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS invite_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS slug         TEXT NOT NULL UNIQUE;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payout_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visibility        TEXT NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS invite_token      UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS slug              TEXT NOT NULL UNIQUE;

-- ── Cupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  max_uses     INTEGER,
  uses_count   INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  UUID NOT NULL REFERENCES coupons(id),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_uses_user ON coupon_uses(user_id);

ALTER TABLE participations
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id      UUID REFERENCES coupons(id);

ALTER TABLE coupons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select" ON coupons;
CREATE POLICY "coupons_select" ON coupons FOR SELECT TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS "coupon_uses_select_own" ON coupon_uses;
CREATE POLICY "coupon_uses_select_own" ON coupon_uses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Saques ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  fee_cents    INTEGER NOT NULL,
  net_cents    INTEGER NOT NULL,
  cpf          TEXT NOT NULL,
  pix_key      TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  admin_note   TEXT,
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
CREATE POLICY "Users can view own withdrawals" ON withdrawals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia saques" ON withdrawals;
CREATE POLICY "Service role gerencia saques" ON withdrawals
  USING (auth.role() = 'service_role');

-- ── Galeria de fotos do evento ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_key  TEXT,
  file_size    INTEGER,
  caption      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_photos_event_id_idx ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS event_photos_user_id_idx  ON event_photos(user_id);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes confirmados podem ver fotos" ON event_photos;
CREATE POLICY "Participantes confirmados podem ver fotos" ON event_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participations
      WHERE participations.event_id = event_photos.event_id
        AND participations.user_id = auth.uid()
        AND participations.status = 'CONFIRMED'
    )
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_photos.event_id
        AND events.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role gerencia fotos" ON event_photos;
CREATE POLICY "Service role gerencia fotos" ON event_photos
  USING (auth.role() = 'service_role');

-- ── Marketplace dos grupos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL
    CHECK (type IN ('SELL', 'RENT', 'BUY', 'LOAN', 'EXCHANGE', 'DONATION', 'SERVICE')),
  price            INTEGER,
  price_negotiable BOOLEAN NOT NULL DEFAULT false,
  payment_methods  TEXT[] NOT NULL DEFAULT '{}',
  contact          TEXT,
  photo_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'DELETED')),
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_listings_group_status
  ON marketplace_listings(group_id, status);
CREATE INDEX IF NOT EXISTS marketplace_listings_expires
  ON marketplace_listings(expires_at) WHERE status = 'ACTIVE';

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros do grupo veem anúncios ativos" ON marketplace_listings;
CREATE POLICY "Membros do grupo veem anúncios ativos" ON marketplace_listings FOR SELECT
  USING (
    status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = marketplace_listings.group_id
        AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Dono vê seus próprios rascunhos" ON marketplace_listings;
CREATE POLICY "Dono vê seus próprios rascunhos" ON marketplace_listings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Membro cria anúncio no seu grupo" ON marketplace_listings;
CREATE POLICY "Membro cria anúncio no seu grupo" ON marketplace_listings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = marketplace_listings.group_id
        AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Dono edita/exclui seu anúncio" ON marketplace_listings;
CREATE POLICY "Dono edita/exclui seu anúncio" ON marketplace_listings FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role gerencia tudo" ON marketplace_listings;
CREATE POLICY "Service role gerencia tudo" ON marketplace_listings
  USING (auth.role() = 'service_role');

-- ── Policies extras em event_ratings ─────────────────────────────────────────
-- Existem no remoto além das criadas por 20260614000004. Reproduzidas como
-- estão para o schema versionado bater com o banco.
DROP POLICY IF EXISTS "Participantes podem avaliar" ON event_ratings;
CREATE POLICY "Participantes podem avaliar" ON event_ratings
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Qualquer um pode ler avaliações" ON event_ratings;
CREATE POLICY "Qualquer um pode ler avaliações" ON event_ratings FOR SELECT
  USING (true);
