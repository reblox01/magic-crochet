CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images viewable by everyone"
  ON gallery_images FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage gallery_images"
  ON gallery_images FOR ALL USING (is_admin()) WITH CHECK (is_admin());
