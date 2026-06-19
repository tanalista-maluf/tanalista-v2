-- Backfill slugs for events that don't have one
CREATE EXTENSION IF NOT EXISTS unaccent;

UPDATE events
SET slug = lower(regexp_replace(unaccent(trim(title)), '[^a-zA-Z0-9]+', '-', 'g'))
        || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';
