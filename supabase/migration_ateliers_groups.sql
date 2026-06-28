-- Add custom group column to ateliers
ALTER TABLE ateliers ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT NULL;
