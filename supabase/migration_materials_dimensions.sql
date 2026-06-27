-- Add materials and dimensions columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS materials TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions TEXT;
