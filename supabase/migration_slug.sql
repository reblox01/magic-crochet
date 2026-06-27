-- Add slug column to products for SEO-friendly URLs
-- Run in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Auto-generate slugs from existing product names
UPDATE products SET slug = LOWER(REPLACE(REPLACE(REPLACE(TRIM(name), ' ', '-'), '''', ''), '.', ''))
WHERE slug IS NULL;

-- Unique index to prevent duplicate slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
