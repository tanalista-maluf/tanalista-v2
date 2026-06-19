-- Denormalized rating columns on events (updated by app on each rating submission)
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,1) DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_count   INTEGER       DEFAULT 0;

-- Cancellation policy: hours before start that user can cancel and get refund
-- NULL = cancellation not allowed; 0 = always allowed; N = must cancel N hours before
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancel_before_hours INTEGER DEFAULT NULL;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('EVENT', 'GROUP')),
  target_id     UUID NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('SPAM', 'INAPPROPRIATE', 'FAKE', 'DANGEROUS', 'OTHER')),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "users can view own reports"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
