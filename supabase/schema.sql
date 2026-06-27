-- Magic Crochet Supabase Schema
-- Run this in Supabase SQL Editor

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image TEXT,
  category TEXT DEFAULT 'autre',
  in_stock BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (admin-created from contact messages)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  format TEXT NOT NULL CHECK (format IN ('individuel', 'equipe')),
  date DATE NOT NULL,
  time TEXT NOT NULL CHECK (time IN ('10:00', '14:00', '17:00')),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT 'autre' CHECK (subject IN ('commande', 'atelier', 'partenariat', 'autre')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partnerships table
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  logo_url TEXT,
  size TEXT DEFAULT 'md' CHECK (size IN ('sm', 'md', 'lg')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings table (runtime settings only)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders(is_paid);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- RLS policies (enable after verifying public queries work)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Public read for products, partnerships, reviews (visible ones)
-- CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (is_active = true);
-- CREATE POLICY "Partnerships are viewable by everyone" ON partnerships FOR SELECT USING (is_active = true);
-- CREATE POLICY "Visible reviews are viewable by everyone" ON reviews FOR SELECT USING (is_visible = true);

-- Authenticated full access for admin operations
-- CREATE POLICY "Admins can do everything with products" ON products FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with orders" ON orders FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with reservations" ON reservations FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with contacts" ON contacts FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with partnerships" ON partnerships FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with reviews" ON reviews FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
-- CREATE POLICY "Admins can do everything with app_settings" ON app_settings FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- Anyone can insert contacts and reservations (public forms)
-- CREATE POLICY "Anyone can submit contacts" ON contacts FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone can submit reservations" ON reservations FOR INSERT WITH CHECK (true);

-- Admin users table (separate from Supabase Auth for structured roles)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('business_hours', '{"monday": "10:00-18:00", "tuesday": "10:00-18:00", "wednesday": "10:00-18:00", "thursday": "10:00-18:00", "friday": "10:00-18:00", "saturday": "10:00-14:00"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
