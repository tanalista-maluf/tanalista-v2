-- Requests to join private events
CREATE TABLE IF NOT EXISTS event_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Requests to join private groups
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- RLS
ALTER TABLE event_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests; organizers can see requests for their events/groups
CREATE POLICY "own or organizer" ON event_join_requests FOR SELECT
  USING (user_id = auth.uid() OR event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));
CREATE POLICY "insert own" ON event_join_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "organizer update" ON event_join_requests FOR UPDATE
  USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

CREATE POLICY "own or admin" ON group_join_requests FOR SELECT
  USING (user_id = auth.uid() OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('OWNER','ADMIN')));
CREATE POLICY "insert own" ON group_join_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update" ON group_join_requests FOR UPDATE
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('OWNER','ADMIN')));
