-- ═══════════════════════════════════════════════════════
-- MIGRATION 0002 — Tabelas
-- ═══════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- PLATFORM_CONFIG  (Doc 15 Adendo 01 — nova tabela)
-- ──────────────────────────────────────────────────────
CREATE TABLE platform_config (
  key         TEXT PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────
-- PROFILES  (estende auth.users)
-- Doc 04 + Doc 15 Adendo 02: CPF obrigatório para saque
-- ──────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            TEXT        NOT NULL,
  username             TEXT        NOT NULL UNIQUE,
  avatar_url           TEXT,
  cpf                  TEXT,                        -- obrigatório ao solicitar primeiro saque
  phone                TEXT,
  bio                  TEXT,
  city                 TEXT,
  wallet_balance       BIGINT      NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0), -- centavos
  mp_account_id        TEXT,                        -- ID da conta MP conectada (OAuth)
  onboarding_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT cpf_format      CHECK (cpf IS NULL OR cpf ~ '^\d{11}$')
);

-- ──────────────────────────────────────────────────────
-- GROUPS
-- ──────────────────────────────────────────────────────
CREATE TABLE groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name         TEXT        NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  visibility   group_visibility NOT NULL DEFAULT 'PUBLIC',
  category     TEXT,
  city         TEXT,
  member_count INT         NOT NULL DEFAULT 1 CHECK (member_count >= 0),
  search_vec   TSVECTOR,   -- FTS Portuguese (Doc 15 Adendo 01)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────
-- GROUP_MEMBERS
-- ──────────────────────────────────────────────────────
CREATE TABLE group_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (group_id, user_id)
);

-- ──────────────────────────────────────────────────────
-- EVENTS
-- Doc 04 + Doc 15 Adendo 02: address e city separados;
-- organizer_exempt; min_check_at calculado; mp_access_token
-- ──────────────────────────────────────────────────────
CREATE TABLE events (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID          NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  organizer_id          UUID          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title                 TEXT          NOT NULL,
  description           TEXT,
  cover_url             TEXT,
  address               TEXT          NOT NULL,    -- endereço completo (Doc 15 Adendo 03 P-04)
  city                  TEXT          NOT NULL,    -- usado no filtro de busca
  category              TEXT,
  status                event_status  NOT NULL DEFAULT 'DRAFT',
  price                 BIGINT        NOT NULL CHECK (price >= 0),         -- centavos
  capacity              INT           NOT NULL CHECK (capacity > 0),
  min_participants      INT           NOT NULL CHECK (min_participants > 0),
  waitlist_capacity     INT           NOT NULL DEFAULT 0 CHECK (waitlist_capacity >= 0),
  starts_at             TIMESTAMPTZ   NOT NULL,
  ends_at               TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ   NOT NULL,
  min_check_at          TIMESTAMPTZ   NOT NULL,   -- starts_at - INTERVAL '12 hours'
  organizer_exempt      BOOLEAN       NOT NULL DEFAULT TRUE,  -- isento de pagamento (Adendo 02)
  mp_access_token       TEXT,                     -- token OAuth do organizador para cobranças
  search_vec            TSVECTOR,                 -- FTS Portuguese
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT deadline_before_start    CHECK (registration_deadline < starts_at),
  CONSTRAINT min_check_before_start   CHECK (min_check_at < starts_at),
  CONSTRAINT min_lte_capacity         CHECK (min_participants <= capacity),
  CONSTRAINT ends_after_starts        CHECK (ends_at IS NULL OR ends_at > starts_at)
);

-- ──────────────────────────────────────────────────────
-- PARTICIPATIONS
-- ──────────────────────────────────────────────────────
CREATE TABLE participations (
  id         UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID                 NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id    UUID                 NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status     participation_status NOT NULL DEFAULT 'PENDING',
  payment_id UUID,               -- FK adicionada após criar payments
  created_at TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ          NOT NULL DEFAULT now(),

  UNIQUE (event_id, user_id)
);

-- ──────────────────────────────────────────────────────
-- WAITLIST_ENTRIES  (Doc 15 Adendo 01: fórmula MAX(1, CEIL(cap × 0.10)))
-- ──────────────────────────────────────────────────────
CREATE TABLE waitlist_entries (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position    INT            NOT NULL CHECK (position > 0),
  status      waitlist_status NOT NULL DEFAULT 'WAITING',
  notified_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,   -- notified_at + 3h (PIX); imediato para cartão salvo
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

  UNIQUE (event_id, user_id),
  UNIQUE (event_id, position)
);

-- ──────────────────────────────────────────────────────
-- PAYMENTS
-- Doc 15 Adendo 01: idempotência por gateway_transaction_id
-- ──────────────────────────────────────────────────────
CREATE TABLE payments (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id       UUID           REFERENCES participations(id) ON DELETE SET NULL,
  wallet_transaction_id  UUID,          -- FK após criar wallet_transactions
  payer_id               UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount                 BIGINT         NOT NULL CHECK (amount > 0),       -- centavos
  platform_fee           BIGINT         NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  gateway_fee            BIGINT         NOT NULL DEFAULT 0 CHECK (gateway_fee >= 0),
  method                 payment_method NOT NULL,
  status                 payment_status NOT NULL DEFAULT 'PENDING',
  gateway_transaction_id TEXT           UNIQUE,  -- idempotência (Doc 15 Adendo 01)
  gateway_response       JSONB,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Adiciona FK de participations → payments
ALTER TABLE participations
  ADD CONSTRAINT fk_participation_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────
-- WALLET_TRANSACTIONS  (Doc 15 Adendo 01: atomicidade via RPC)
-- ──────────────────────────────────────────────────────
CREATE TABLE wallet_transactions (
  id            UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID                      NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type          wallet_transaction_type   NOT NULL,
  amount        BIGINT                    NOT NULL, -- positivo = crédito, negativo = débito
  balance_after BIGINT                    NOT NULL CHECK (balance_after >= 0),
  description   TEXT,
  payment_id    UUID                      REFERENCES payments(id) ON DELETE SET NULL,
  event_id      UUID                      REFERENCES events(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ               NOT NULL DEFAULT now()
);

-- Adiciona FK de payments → wallet_transactions
ALTER TABLE payments
  ADD CONSTRAINT fk_payment_wallet_tx
  FOREIGN KEY (wallet_transaction_id) REFERENCES wallet_transactions(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────
-- NOTIFICATIONS
-- Doc 15 Adendo 03 P-06: e-mail ao organizador a cada mudança de status
-- ──────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT              NOT NULL,
  read       BOOLEAN           NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────
-- AUDIT_LOGS  (Doc 09 — Segurança)
-- ──────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,  -- INSERT, UPDATE, DELETE, AUTH, WEBHOOK...
  table_name TEXT,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
