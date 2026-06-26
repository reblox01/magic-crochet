-- Add invite tracking + password setup columns to admin_users
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_password boolean DEFAULT true;

-- Existing users (owner, manually created) already have passwords
UPDATE admin_users SET has_password = true WHERE has_password IS NULL;

-- Invited users who haven't set a password yet
UPDATE admin_users SET has_password = false WHERE invited_at IS NOT NULL AND invited_accepted_at IS NULL;
