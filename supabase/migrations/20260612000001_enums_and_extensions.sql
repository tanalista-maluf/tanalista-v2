-- ═══════════════════════════════════════════════════════
-- MIGRATION 0001 — Extensões e Enums
-- ═══════════════════════════════════════════════════════

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ──────────────────────────────────────────────────────
-- ENUMS (Doc 04 + Doc 15 Adendo 01)
-- ──────────────────────────────────────────────────────

CREATE TYPE group_visibility      AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TYPE event_status          AS ENUM (
  'DRAFT',
  'OPEN',
  'PENDING',       -- T-12h: aguardando confirmação de mínimo de participantes
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE participation_status  AS ENUM (
  'CONFIRMED',     -- pagamento aprovado
  'PENDING',       -- aguardando pagamento (apenas PIX)
  'CANCELLED',
  'WAITLISTED'
);

CREATE TYPE waitlist_status       AS ENUM (
  'WAITING',
  'NOTIFIED',      -- vaga disponível, aguardando pagamento (prazo 3h)
  'EXPIRED',
  'CONFIRMED'
);

CREATE TYPE payment_method        AS ENUM ('PIX', 'CREDIT_CARD', 'WALLET');

CREATE TYPE payment_status        AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REFUNDED',
  'CANCELLED'
);

CREATE TYPE wallet_transaction_type AS ENUM (
  'DEPOSIT',       -- recarga da carteira
  'PAYMENT',       -- pagamento de evento
  'REFUND',        -- estorno para carteira
  'WITHDRAWAL',    -- saque (exige CPF)
  'PAYOUT'         -- repasse ao organizador
);

CREATE TYPE notification_type AS ENUM (
  'EVENT_CONFIRMED',
  'EVENT_CANCELLED',
  'EVENT_REMINDER',
  'EVENT_STATUS_CHANGE',
  'WAITLIST_NOTIFIED',
  'WAITLIST_EXPIRED',
  'PAYMENT_APPROVED',
  'PAYMENT_FAILED',
  'PAYOUT_PROCESSED',
  'ORGANIZER_STATUS_CHANGE'
);
