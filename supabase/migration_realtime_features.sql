-- Migration: Real-time, activity log, notifications, contact replies, online status
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1) Admin users: add online status + avatar columns
-- ============================================================
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- 2) Activity log table
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read activity log" ON activity_log FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert activity log" ON activity_log FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- 3) Notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read own notifications" ON notifications FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update own notifications" ON notifications FOR UPDATE USING (is_admin());

-- ============================================================
-- 4) Contact replies table
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_replies_contact ON contact_replies(contact_id);
ALTER TABLE contact_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read contact replies" ON contact_replies FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert contact replies" ON contact_replies FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- 5) Enable Supabase Realtime on all tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  products, gallery_images, avis, reviews,
  partnerships, app_settings, orders, contacts,
  reservations, ateliers, notifications, activity_log;
