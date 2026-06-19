-- Drop existing constraint first, then migrate data, then add new constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_visibility_check;

-- Convert GROUP and INVITE → PRIVATE
UPDATE events
SET visibility = 'PRIVATE'
WHERE visibility IN ('GROUP', 'INVITE');

-- Allow only PUBLIC and PRIVATE going forward
ALTER TABLE events ADD CONSTRAINT events_visibility_check
  CHECK (visibility IN ('PUBLIC', 'PRIVATE'));
