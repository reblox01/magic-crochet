-- Magic Crochet Migration V2
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- Date: 2026-06-26

-- ============================================================
-- 1. PRODUCTS: add fields to match Product type
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS materials TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. PARTNERSHIPS: fix column names (code uses 'logo' and 'website')
-- ============================================================
-- Check if old column names exist before renaming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partnerships' AND column_name = 'logo_url') THEN
    ALTER TABLE partnerships RENAME COLUMN logo_url TO logo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partnerships' AND column_name = 'url') THEN
    ALTER TABLE partnerships RENAME COLUMN url TO website;
  END IF;
END $$;

-- ============================================================
-- 3. REVIEWS: fix column name + add role
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'text') THEN
    ALTER TABLE reviews RENAME COLUMN text TO comment;
  END IF;
END $$;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS role TEXT;

-- ============================================================
-- 4. CONTACTS: add phone column
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================================
-- 5. ADMIN_USERS: add display_name
-- ============================================================
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ============================================================
-- 6. APP_SETTINGS: add all new fields
-- ============================================================
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Casablanca, Maroc';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '+212 600 00 00 00';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'contact@magiccrochet.ma';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '@magic.crochet_0';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '@magiccrochet_0';

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS impact_stats JSONB DEFAULT '{
  "textile_detourne": "150 kg",
  "dh_redistribues": "6 000 DH",
  "ateliers_pilotes": "20+",
  "instagram_followers": "7 000+",
  "beneficiaires": "3",
  "vies_touchees": "300+"
}'::jsonb;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS workshop_config JSONB DEFAULT '{
  "b2c_price": 250,
  "b2b_price": 800,
  "time_slots": ["10:00", "14:00", "17:00"],
  "closed_days": [1],
  "max_seats": 10,
  "duration_hours": 3,
  "cancellation_hours": 48
}'::jsonb;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS seo JSONB DEFAULT '{
  "site_title": "Magic Crochet - Fil recyclé, art crocheté",
  "site_description": "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc.",
  "og_image": "/og.png",
  "domain": "magic-crochet.com"
}'::jsonb;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hero_headline JSONB DEFAULT '{
  "line1": "Histoires",
  "line2": "bouclées,",
  "line3": "fil recyclé.",
  "subtitle": "Magic Crochet boucle les textiles oubliés en objets contemporains et en ateliers émancipateurs, un mouvement artisanal marocain, une maille à la fois."
}'::jsonb;

-- ============================================================
-- 7. GALLERY_IMAGES: new table for atelier gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Clean up old individual keys and insert consolidated 'site' key
-- ============================================================
DELETE FROM app_settings WHERE key IN ('maintenance_mode', 'business_hours');

INSERT INTO app_settings (key, value) VALUES
  ('site', '{
    "maintenance_mode": false,
    "business_hours": "Lun-Sam: 9h-19h",
    "business_phone": "+212 600 00 00 00",
    "business_email": "contact@magiccrochet.ma",
    "hero_tagline": "L''élégance artisanale au crochet",
    "about_text": "Magic Crochet crée des pièces uniques en crochet, alliant tradition marocaine et designs modernes.",
    "location": "Casablanca, Maroc",
    "phone": "+212 600 00 00 00",
    "email": "contact@magiccrochet.ma",
    "instagram": "@magic.crochet_0",
    "tiktok": "@magiccrochet_0"
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
