-- Magic Crochet RLS Policies
-- Run this in Supabase SQL Editor AFTER schema.sql and migration_v2.sql

-- ============================================================
-- 0. Helper function (SECURITY DEFINER bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'owner');
$$;

-- ============================================================
-- 1. ENABLE RLS on all tables
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_replies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. DROP existing policies (idempotent)
-- ============================================================
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
  END LOOP;
END $$;

-- ============================================================
-- 3. PUBLIC READ for frontend-facing tables
-- ============================================================
CREATE POLICY "Products viewable by everyone"
  ON products FOR SELECT USING (true);

CREATE POLICY "Partnerships viewable by everyone"
  ON partnerships FOR SELECT USING (is_active = true);

CREATE POLICY "Visible reviews viewable by everyone"
  ON reviews FOR SELECT USING (is_visible = true);

CREATE POLICY "Gallery images viewable by everyone"
  ON gallery_images FOR SELECT USING (is_active = true);

CREATE POLICY "App settings readable by everyone"
  ON app_settings FOR SELECT USING (true);

-- ============================================================
-- 4. AUTHENTICATED ADMIN full access via helper functions
-- ============================================================
CREATE POLICY "Admins can manage products"
  ON products FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage reservations"
  ON reservations FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage contacts"
  ON contacts FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage partnerships"
  ON partnerships FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage app_settings"
  ON app_settings FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage gallery_images"
  ON gallery_images FOR ALL USING (is_admin());

-- admin_users: anyone authenticated can read (for display_name), only owner can manage
CREATE POLICY "Authenticated users can view admin_users"
  ON admin_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can manage admin_users"
  ON admin_users FOR ALL
  USING (is_owner());

-- ============================================================
-- 5. PUBLIC INSERT for contact/booking forms
-- ============================================================
CREATE POLICY "Anyone can submit contacts"
  ON contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit reservations"
  ON reservations FOR INSERT WITH CHECK (true);

-- ============================================================
-- 6. NOTIFICATIONS (admin read, service role write)
-- ============================================================
CREATE POLICY "Admins can read notifications"
  ON notifications FOR SELECT USING (is_admin());

CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- 7. ACTIVITY LOG (admin read, service role write)
-- ============================================================
CREATE POLICY "Admins can read activity log"
  ON activity_log FOR SELECT USING (is_admin());

CREATE POLICY "Service can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 8. CONTACT REPLIES (admin read/write)
-- ============================================================
CREATE POLICY "Admins can manage contact replies"
  ON contact_replies FOR ALL USING (is_admin());

CREATE POLICY "Anyone can submit contact replies"
  ON contact_replies FOR INSERT WITH CHECK (true);
