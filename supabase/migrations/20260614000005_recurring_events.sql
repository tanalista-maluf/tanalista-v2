ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);
