-- ═══════════════════════════════════════════════════════
-- MIGRATION 0004 — Row Level Security (RLS)
-- Doc 07 (Segurança) + Doc 15 Adendo 01
-- ═══════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- Habilitar RLS em todas as tabelas
-- ──────────────────────────────────────────────────────
ALTER TABLE platform_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────
-- PLATFORM_CONFIG  (somente leitura pública)
-- ──────────────────────────────────────────────────────
CREATE POLICY "platform_config_select"
  ON platform_config FOR SELECT
  USING (TRUE);

-- Escrita apenas via service_role (sem política de escrita para anon/authenticated)

-- ──────────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────────
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Inserção gerenciada pelo trigger handle_new_user (SECURITY DEFINER)

-- ──────────────────────────────────────────────────────
-- GROUPS
-- ──────────────────────────────────────────────────────
CREATE POLICY "groups_select"
  ON groups FOR SELECT
  USING (
    visibility = 'PUBLIC'
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "groups_insert"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "groups_update_owner"
  ON groups FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "groups_delete_owner"
  ON groups FOR DELETE
  USING (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────
-- GROUP_MEMBERS
-- ──────────────────────────────────────────────────────
CREATE POLICY "group_members_select"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
        AND (g.visibility = 'PUBLIC' OR g.owner_id = auth.uid())
    )
  );

CREATE POLICY "group_members_insert"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "group_members_delete_self"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────
-- EVENTS
-- ──────────────────────────────────────────────────────
CREATE POLICY "events_select"
  ON events FOR SELECT
  USING (
    status != 'DRAFT'
    OR organizer_id = auth.uid()
  );

CREATE POLICY "events_insert"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organizer_id = auth.uid()
    -- organizador precisa ser membro do grupo
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = events.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "events_update_organizer"
  ON events FOR UPDATE
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "events_delete_organizer"
  ON events FOR DELETE
  USING (organizer_id = auth.uid() AND status = 'DRAFT');

-- ──────────────────────────────────────────────────────
-- PARTICIPATIONS
-- ──────────────────────────────────────────────────────
CREATE POLICY "participations_select"
  ON participations FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = participations.event_id AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "participations_insert"
  ON participations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "participations_update_own"
  ON participations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cancelamento pelo organizador (via service_role na API)

-- ──────────────────────────────────────────────────────
-- WAITLIST_ENTRIES
-- ──────────────────────────────────────────────────────
CREATE POLICY "waitlist_select"
  ON waitlist_entries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = waitlist_entries.event_id AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "waitlist_insert"
  ON waitlist_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "waitlist_update_own"
  ON waitlist_entries FOR UPDATE
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────
-- PAYMENTS
-- ──────────────────────────────────────────────────────
CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM participations p
      JOIN events e ON e.id = p.event_id
      WHERE p.id = payments.participation_id AND e.organizer_id = auth.uid()
    )
  );

-- Escrita gerenciada via API Routes / Edge Functions (service_role)

-- ──────────────────────────────────────────────────────
-- WALLET_TRANSACTIONS
-- ──────────────────────────────────────────────────────
CREATE POLICY "wallet_tx_select_own"
  ON wallet_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Escrita gerenciada via funções RPC e API Routes

-- ──────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ──────────────────────────────────────────────────────
-- AUDIT_LOGS  (somente leitura pelo próprio usuário ou admin)
-- ──────────────────────────────────────────────────────
CREATE POLICY "audit_select_own"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());
