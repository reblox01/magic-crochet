-- Add image_url column to reviews table for chat screenshot uploads
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url TEXT;