-- ═══════════════════════════════════════════════════════
-- MIGRATION 0003 — Índices, FTS, Funções e Triggers
-- ═══════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- ÍNDICES  (Doc 15 Adendo 01)
-- ──────────────────────────────────────────────────────

-- profiles
CREATE INDEX idx_profiles_username      ON profiles (username);
CREATE INDEX idx_profiles_city          ON profiles (city);

-- groups
CREATE INDEX idx_groups_owner           ON groups (owner_id);
CREATE INDEX idx_groups_visibility      ON groups (visibility);
CREATE INDEX idx_groups_city            ON groups (city);
CREATE INDEX idx_groups_search          ON groups USING GIN (search_vec);
CREATE INDEX idx_groups_cursor          ON groups (created_at DESC, id);

-- group_members
CREATE INDEX idx_group_members_user     ON group_members (user_id);
CREATE INDEX idx_group_members_group    ON group_members (group_id);

-- events
CREATE INDEX idx_events_group           ON events (group_id);
CREATE INDEX idx_events_organizer       ON events (organizer_id);
CREATE INDEX idx_events_status          ON events (status);
CREATE INDEX idx_events_city            ON events (city);
CREATE INDEX idx_events_starts_at       ON events (starts_at);
CREATE INDEX idx_events_search          ON events USING GIN (search_vec);
CREATE INDEX idx_events_cursor          ON events (created_at DESC, id);
-- índice composto para jobs pg_cron
CREATE INDEX idx_events_status_starts   ON events (status, starts_at);
CREATE INDEX idx_events_status_mincheck ON events (status, min_check_at);

-- participations
CREATE INDEX idx_participations_event   ON participations (event_id);
CREATE INDEX idx_participations_user    ON participations (user_id);
CREATE INDEX idx_participations_status  ON participations (status);

-- waitlist_entries
CREATE INDEX idx_waitlist_event         ON waitlist_entries (event_id);
CREATE INDEX idx_waitlist_user          ON waitlist_entries (user_id);
CREATE INDEX idx_waitlist_event_pos     ON waitlist_entries (event_id, position);
CREATE INDEX idx_waitlist_status        ON waitlist_entries (status);
CREATE INDEX idx_waitlist_expires       ON waitlist_entries (expires_at) WHERE status = 'NOTIFIED';

-- payments
CREATE INDEX idx_payments_payer         ON payments (payer_id);
CREATE INDEX idx_payments_status        ON payments (status);
CREATE INDEX idx_payments_participation ON payments (participation_id);
CREATE INDEX idx_payments_gateway_tx    ON payments (gateway_transaction_id);

-- wallet_transactions
CREATE INDEX idx_wallet_tx_user         ON wallet_transactions (user_id);
CREATE INDEX idx_wallet_tx_user_cursor  ON wallet_transactions (user_id, created_at DESC, id);

-- notifications
CREATE INDEX idx_notifications_user     ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications (user_id) WHERE read = FALSE;

-- audit_logs
CREATE INDEX idx_audit_user             ON audit_logs (user_id);
CREATE INDEX idx_audit_table_record     ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_created          ON audit_logs (created_at DESC);

-- ──────────────────────────────────────────────────────
-- FULL-TEXT SEARCH  (dicionário português, Doc 15 Adendo 01)
-- ──────────────────────────────────────────────────────

-- Função de atualização do search_vec de grupos
CREATE OR REPLACE FUNCTION update_group_search_vec()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vec :=
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.city, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.category, ''))), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_search_vec
  BEFORE INSERT OR UPDATE OF name, description, city, category ON groups
  FOR EACH ROW EXECUTE FUNCTION update_group_search_vec();

-- Função de atualização do search_vec de eventos
CREATE OR REPLACE FUNCTION update_event_search_vec()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vec :=
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.city, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.category, ''))), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_search_vec
  BEFORE INSERT OR UPDATE OF title, description, city, category ON events
  FOR EACH ROW EXECUTE FUNCTION update_event_search_vec();

-- ──────────────────────────────────────────────────────
-- TRIGGERS DE ATUALIZAÇÃO  (updated_at automático)
-- ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_participations_updated_at
  BEFORE UPDATE ON participations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────
-- TRIGGER: criar profile ao registrar usuário
-- ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    -- username inicial = parte do email antes do @, sanitizado
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ──────────────────────────────────────────────────────
-- TRIGGER: atualizar member_count ao adicionar/remover membros
-- ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_member_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION sync_group_member_count();

-- ──────────────────────────────────────────────────────
-- FUNÇÃO RPC: crédito/débito atômico na carteira
-- Doc 15 Adendo 01: funções RPC em transação
-- ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id    UUID,
  p_amount     BIGINT,
  p_type       wallet_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_payment_id  UUID DEFAULT NULL,
  p_event_id    UUID DEFAULT NULL
)
RETURNS wallet_transactions LANGUAGE plpgsql AS $$
DECLARE
  v_balance BIGINT;
  v_tx      wallet_transactions;
BEGIN
  -- Lock da linha do usuário para evitar race condition
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
  END IF;

  UPDATE profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_balance;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, payment_id, event_id)
  VALUES (p_user_id, p_type, p_amount, v_balance, p_description, p_payment_id, p_event_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id     UUID,
  p_amount      BIGINT,
  p_type        wallet_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_payment_id  UUID DEFAULT NULL,
  p_event_id    UUID DEFAULT NULL
)
RETURNS wallet_transactions LANGUAGE plpgsql AS $$
DECLARE
  v_balance BIGINT;
  v_tx      wallet_transactions;
BEGIN
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo: %, Débito: %', v_balance, p_amount;
  END IF;

  UPDATE profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_balance;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, payment_id, event_id)
  VALUES (p_user_id, p_type, -p_amount, v_balance, p_description, p_payment_id, p_event_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- ──────────────────────────────────────────────────────
-- FUNÇÃO UTILITÁRIA: calcular capacidade da fila de espera
-- Doc 15 Adendo 01: MAX(1, CEIL(capacity * 0.10))
-- ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_waitlist_capacity(p_capacity INT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(1, CEIL(p_capacity * 0.10))::INT;
$$;
