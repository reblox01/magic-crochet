-- Insert admin user into admin_users table (needed for RLS policies + role management)
-- This links the auth user to the admin_users table with owner role
INSERT INTO admin_users (id, email, role, display_name)
SELECT id, email, 'owner', 'Admin'
FROM auth.users
WHERE email = 'admin@magic-crochet.com'
ON CONFLICT (id) DO UPDATE SET role = 'owner';
