-- Adds per-order livraison prix + QR customization columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS livraison_prix NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_text TEXT;
