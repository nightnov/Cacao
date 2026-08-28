-- ═══════════════════════════════════════════════════════════════════════════
-- Livraison par commune et tarification à la distance
--
-- Deux problèmes corrigés :
--
-- 1. Abidjan était facturée 5 000 FCFA d'un bloc, alors que la course Yango
--    coûte 1 500 à 2 000 selon la commune. Les clients d'Abidjan payaient deux
--    à trois fois le coût réel de leur livraison.
--
-- 2. Le prix ne dépendait que de la ville d'arrivée, jamais du trajet. Or le
--    livreur part d'un point fixe (le retrait) : c'est la distance entre ce
--    point et le client qui fait le prix, exactement comme chez Yango.
--
-- L'API Yango sait renvoyer un devis, mais elle exige une clé sous contrat
-- partenaire. En attendant, le prix est calculé localement selon la même
-- logique — base + distance, avec plancher et plafond.
-- ═══════════════════════════════════════════════════════════════════════════

-- Rattachement d'une zone à sa ville. Les communes d'Abidjan portent
-- parent_city = 'Abidjan', ce qui permet de les regrouper dans le sélecteur.
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS parent_city TEXT;

-- Une zone désactivée reste en base — les commandes déjà passées y font
-- référence — mais disparaît du choix proposé au client.
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- ───────────────────────────────────────────────────────────────────────────
-- Communes du district d'Abidjan
--
-- Toutes au même tarif de départ : le plafond annoncé. Personne ne connaît
-- encore le coût réel commune par commune, et deviner à la baisse ferait
-- perdre de l'argent sur chaque course. À ajuster depuis Frais de livraison
-- au fur et à mesure des vraies courses.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO shipping_fees (city, price_fcfa, parent_city, sort_order)
SELECT * FROM (VALUES
  ('Abidjan — Abobo',      2000, 'Abidjan',  1),
  ('Abidjan — Adjamé',     2000, 'Abidjan',  2),
  ('Abidjan — Attécoubé',  2000, 'Abidjan',  3),
  ('Abidjan — Cocody',     2000, 'Abidjan',  4),
  ('Abidjan — Koumassi',   2000, 'Abidjan',  5),
  ('Abidjan — Marcory',    2000, 'Abidjan',  6),
  ('Abidjan — Plateau',    2000, 'Abidjan',  7),
  ('Abidjan — Port-Bouët', 2000, 'Abidjan',  8),
  ('Abidjan — Treichville',2000, 'Abidjan',  9),
  ('Abidjan — Yopougon',   2000, 'Abidjan', 10),
  ('Abidjan — Bingerville',2000, 'Abidjan', 11),
  ('Abidjan — Anyama',     2000, 'Abidjan', 12),
  ('Abidjan — Songon',     2000, 'Abidjan', 13)
) AS seed(city, price_fcfa, parent_city, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shipping_fees WHERE parent_city = 'Abidjan');

-- L'ancienne ligne « Abidjan » est retirée du choix mais conservée : les
-- commandes déjà passées la désignent, et la supprimer les ferait recalculer
-- avec des frais nuls.
UPDATE shipping_fees
SET is_active = false
WHERE city = 'Abidjan'
  AND EXISTS (SELECT 1 FROM shipping_fees WHERE parent_city = 'Abidjan');

-- ───────────────────────────────────────────────────────────────────────────
-- Position de livraison sur la commande
--
-- Renseignée uniquement si le client a accepté de la partager. À Abidjan, une
-- adresse écrite ne suffit souvent pas à retrouver quelqu'un ; un point sur la
-- carte, si.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Précision annoncée par le navigateur, en mètres. Conservée pour savoir si le
-- point mérite confiance : un ordinateur qui se repère au Wi-Fi peut se
-- tromper de plusieurs kilomètres, soit plusieurs communes à Abidjan.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_accuracy_m INTEGER;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(6,1);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT
  CHECK (delivery_method IN ('distance', 'commune', 'defaut'));

-- ───────────────────────────────────────────────────────────────────────────
-- Grille tarifaire
--
-- Le point de retrait est vide au départ : il doit être relevé sur place,
-- depuis un téléphone, dans Frais de livraison. Y mettre des coordonnées
-- inventées produirait des prix faux sans que personne s'en aperçoive.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('pickup_lat', NULL),
  ('pickup_lng', NULL),
  -- Calibré sur la géographie d'Abidjan depuis Yopougon : le district s'étale
  -- sur une trentaine de kilomètres de route. Une grille plus raide enverrait
  -- presque toutes les communes contre le plafond, ce qui reviendrait à un
  -- tarif unique. Ici : Attécoubé 1 500, Plateau 1 600, Abobo 1 700,
  -- Koumassi 1 800, Bingerville 2 000. Valeurs de départ, à corriger après
  -- comparaison avec de vraies courses.
  ('delivery_base_fcfa', '1300'),
  ('delivery_per_km_fcfa', '20'),
  ('delivery_road_factor', '1.4'),
  ('delivery_min_fcfa', '1500'),
  ('delivery_max_fcfa', '2000')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
