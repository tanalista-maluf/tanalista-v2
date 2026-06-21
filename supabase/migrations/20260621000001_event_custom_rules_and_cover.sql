-- Custom rules/guidelines text for events (editable anytime by organizer)
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_rules TEXT DEFAULT NULL;

-- cover_url already exists; just ensure it's nullable
-- (no migration needed — column exists from prior schema)
