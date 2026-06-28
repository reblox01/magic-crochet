-- Add custom page permissions to admin_users
-- Update role CHECK to include 'custom'
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'admin', 'custom'));

-- Add custom_permissions JSONB column (null = no restrictions, array of page paths = restricted)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;

-- Add temporary access expiry (null = permanent, timestamp = auto-revoke after this date)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions_expires_at TIMESTAMPTZ DEFAULT NULL;
