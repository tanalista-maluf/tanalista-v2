-- Evolução da tabela notifications: adiciona read_at e data tipado
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data    JSONB DEFAULT '{}';

-- Migra a coluna read (boolean) → read_at (timestamptz)
UPDATE notifications SET read_at = NOW() WHERE read = TRUE AND read_at IS NULL;

-- Índices (somente se não existirem)
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx  ON notifications(user_id) WHERE read_at IS NULL;

-- RLS já habilitado na migration 004, apenas adiciona policies se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users can view own notifications'
  ) THEN
    CREATE POLICY "users can view own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users can update own notifications'
  ) THEN
    CREATE POLICY "users can update own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
