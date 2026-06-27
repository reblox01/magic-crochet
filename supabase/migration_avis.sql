-- Combined migration: avis table + partnerships size column
-- Run this in Supabase SQL Editor

-- Avis (Testimonials) table
CREATE TABLE IF NOT EXISTS avis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO avis (name, role, quote, is_visible, sort_order) VALUES
('Afaf', 'Étudiante · Animatrice', 'Chaque matin, je me posais la même question : comment financer mes études sans peser sur ma famille ? Magic Crochet m''a donné une réponse.', true, 0),
('Fati', 'Étudiante · Animatrice', 'Je suis arrivée hésitante. Je suis repartie avec un métier, un revenu et la certitude que je peux y arriver.', true, 1),
('Manal', 'Bénéficiaire · Artisane', 'Chaque dirham gagné ici est un pas vers la stabilité pour ma famille. Ici j''ai trouvé bien plus qu''un atelier.', true, 2);

-- Partnerships: ensure size column has proper default
ALTER TABLE partnerships ALTER COLUMN size SET DEFAULT 'md';

-- Avis RLS
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible avis"
  ON avis FOR SELECT USING (is_visible = true);

CREATE POLICY "Admins can manage avis"
  ON avis FOR ALL USING (is_admin()) WITH CHECK (is_admin());
