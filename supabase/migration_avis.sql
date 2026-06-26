-- Avis (Testimonials) table
-- Stores beneficiary stories displayed on homepage
CREATE TABLE IF NOT EXISTS avis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default beneficiaries
INSERT INTO avis (name, role, quote, is_visible, sort_order) VALUES
('Afaf', 'Beneficiaire', 'Ce atelier a change ma vie. J''ai appris un metier et je peux enfin subvenir a mes besoins.', true, 0),
('Fati', 'Beneficiaire', 'Grace a Magic Crochet, j''ai retrouve ma confiance et je crée des pieces qui racontent mon histoire.', true, 1),
('Manal', 'Beneficiaire', 'Ici j''ai trouve plus qu''un atelier, j''ai trouve une famille qui me soutient chaque jour.', true, 2);

-- RLS policies
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible avis
CREATE POLICY "Public can view visible avis"
  ON avis FOR SELECT
  USING (is_visible = true);

-- Admins can do everything
CREATE POLICY "Admins can manage avis"
  ON avis FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
