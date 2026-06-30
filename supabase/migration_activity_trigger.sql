-- Auto-log all table changes to activity_log via trigger
-- Uses TG_TABLE_NAME to pick the right column per table

CREATE OR REPLACE FUNCTION log_table_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_entity text;
  v_name text;
  v_user_id uuid;
  v_user_email text;
  v_row jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  END IF;

  v_entity := TG_TABLE_NAME;

  -- Pick name column per table (avoids missing-column errors)
  v_row := to_jsonb(COALESCE(NEW, OLD));
  v_name := CASE TG_TABLE_NAME
    WHEN 'products'       THEN v_row->>'name'
    WHEN 'partnerships'   THEN v_row->>'name'
    WHEN 'gallery_images' THEN v_row->>'title'
    WHEN 'reviews'        THEN v_row->>'customer_name'
    WHEN 'avis'           THEN v_row->>'customer_name'
    WHEN 'orders'         THEN v_row->>'customer_name'
    WHEN 'contacts'       THEN v_row->>'name'
    WHEN 'ateliers'       THEN v_row->>'nom'
    WHEN 'admin_users'    THEN v_row->>'email'
    ELSE v_row->>'name'
  END;

  -- Try to get user from current setting (set by PostgREST when using auth)
  BEGIN
    v_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
    v_user_email := current_setting('request.jwt.claims', true)::json->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
    v_user_email := NULL;
  END;

  -- Skip activity_log and notifications tables to avoid infinite trigger
  IF TG_TABLE_NAME = 'activity_log' OR TG_TABLE_NAME = 'notifications' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO activity_log (user_id, user_email, action, entity_type, entity_name)
  VALUES (v_user_id, v_user_email, v_action, v_entity, v_name);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS fix: the trigger is SECURITY DEFINER (runs as DB owner), so the INSERT
-- needs to bypass the is_admin() check. Allow all inserts — the trigger
-- function itself controls what gets written.
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can insert activity log" ON activity_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Trigger can insert activity log" ON activity_log
  FOR INSERT WITH CHECK (true);

-- Create triggers (DROP first so re-running is safe)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'products', 'partnerships', 'gallery_images', 'reviews', 'avis',
    'orders', 'contacts', 'ateliers', 'admin_users'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_change_%s ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER log_change_%s
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION log_table_change()',
      t, t
    );
  END LOOP;
END;
$$;
