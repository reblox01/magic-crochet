-- Seed 3 sample reviews with realistic client feedback
-- Run this after migration_reviews_image.sql adds the image_url column

INSERT INTO reviews (customer_name, rating, comment, is_visible, image_url) VALUES
(
  'Yasmina B.',
  5,
  'J''ai offert le sac "Marrakech" à ma sœur pour son anniversaire, elle ne le quitte plus ! La qualité du fil recyclé est incroyable, on sent que c''est fait avec amour. Merci aux artisanes ❤️',
  true,
  null
),
(
  'Karim E.',
  5,
  'Atelier crochet découvert par hasard sur Instagram, je me suis inscrit avec ma copine. 3h de pure détente, on a appris les bases et on repart chacun avec son premier bob. Afaf est une prof géniale, patiente et drôle. On revient pour le niveau 2 !',
  true,
  null
),
(
  'Sarah L.',
  4,
  'Commande reçue en 4 jours, emballage soigné avec un petit mot manuscrit. Le panier "Essaouira" est encore plus beau en vrai, les couleurs terracotta/crème vont parfaitement avec mon salon. Seul bémol : un peu cher pour mon budget étudiant mais la qualité justifie.',
  true,
  null
);