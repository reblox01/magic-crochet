-- Add missing RLS policies for notifications, activity_log, contact_replies
-- These were dropped by rls_policies.sql's blanket DROP ALL but never recreated

-- ENABLE RLS (idempotent)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_replies ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies first
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('notifications', 'activity_log', 'contact_replies')) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
  END LOOP;
END $$;

-- notifications
CREATE POLICY "Admins can read notifications"
  ON notifications FOR SELECT USING (is_admin());
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- activity_log
CREATE POLICY "Admins can read activity log"
  ON activity_log FOR SELECT USING (is_admin());
CREATE POLICY "Service can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (true);

-- contact_replies
CREATE POLICY "Admins can manage contact replies"
  ON contact_replies FOR ALL USING (is_admin());
CREATE POLICY "Anyone can submit contact replies"
  ON contact_replies FOR INSERT WITH CHECK (true);
