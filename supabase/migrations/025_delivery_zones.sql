-- ═══════════════════════════════════════════════════════════════════════════
-- Livraison : zones, taille de colis et position du client
--
-- Ce que corrige cette migration :
--
-- 1. Abidjan était facturée 5 000 FCFA d'un bloc, sans distinction de commune
--    ni de contenu. Un clavier et une tour de bureau coûtaient pareil.
--
-- 2. Le prix ne dépendait pas de l'encombrement, alors que c'est précisément
--    ce que facturent les transporteurs locaux : leurs grilles sont bâties sur
--    des tailles de colis — petit, moyen, grand — définies par des dimensions,
--    croisées avec des zones géographiques.
--
-- Choix de conception : AUCUN TRANSPORTEUR N'EST NOMMÉ, ni en base ni côté
-- client. Le site affiche « Livraison » et un prix. Qui porte réellement le
-- colis se décide commande par commande, en dehors du site : le prestataire
-- peut changer sans qu'une ligne de code bouge.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Zones
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS parent_city TEXT;

-- Une zone désactivée reste en base — des commandes déjà passées la désignent —
-- mais disparaît du choix proposé au client.
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

INSERT INTO shipping_fees (city, price_fcfa, parent_city, sort_order)
SELECT * FROM (VALUES
  ('Abidjan — Abobo',       2000, 'Abidjan',  1),
  ('Abidjan — Adjamé',      2000, 'Abidjan',  2),
  ('Abidjan — Attécoubé',   2000, 'Abidjan',  3),
  ('Abidjan — Cocody',      2000, 'Abidjan',  4),
  ('Abidjan — Koumassi',    2000, 'Abidjan',  5),
  ('Abidjan — Marcory',     2000, 'Abidjan',  6),
  ('Abidjan — Plateau',     2000, 'Abidjan',  7),
  ('Abidjan — Port-Bouët',  2000, 'Abidjan',  8),
  ('Abidjan — Treichville', 2000, 'Abidjan',  9),
  ('Abidjan — Yopougon',    2000, 'Abidjan', 10),
  ('Abidjan — Bingerville', 2000, 'Abidjan', 11),
  ('Abidjan — Anyama',      2000, 'Abidjan', 12),
  ('Abidjan — Songon',      2000, 'Abidjan', 13)
) AS seed(city, price_fcfa, parent_city, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shipping_fees WHERE parent_city = 'Abidjan');

-- L'ancienne ligne « Abidjan » sort du choix mais reste en base : la supprimer
-- ferait recalculer à zéro les commandes qui la désignent.
UPDATE shipping_fees
SET is_active = false
WHERE city = 'Abidjan'
  AND EXISTS (SELECT 1 FROM shipping_fees WHERE parent_city = 'Abidjan');

-- ───────────────────────────────────────────────────────────────────────────
-- Tailles de colis
--
-- Les dimensions restent VIDES : elles doivent être recopiées telles quelles
-- de la grille du transporteur retenu. Inventer « 30 × 20 × 10 cm » donnerait
-- un guide crédible et faux, et des colis refusés au dépôt.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_sizes (
  code TEXT PRIMARY KEY CHECK (code IN ('petit', 'moyen', 'grand')),
  label TEXT NOT NULL,
  dimensions TEXT,
  examples TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE parcel_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parcel_sizes_public_read" ON parcel_sizes;
CREATE POLICY "parcel_sizes_public_read" ON parcel_sizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "parcel_sizes_admin_write" ON parcel_sizes;
CREATE POLICY "parcel_sizes_admin_write" ON parcel_sizes
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO parcel_sizes (code, label, examples, sort_order) VALUES
  ('petit', 'Petit colis',  'Clavier, souris, casque, câbles',      1),
  ('moyen', 'Moyen colis',  'Ordinateur portable, petit accessoire', 2),
  ('grand', 'Grand colis',  'Écran, tour de bureau, config gamer',   3)
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Grille zone × taille
--
-- Un prix par zone et par taille de colis. Les valeurs de départ sont les
-- seuls coûts réellement constatés à ce jour : 3 000 FCFA pour un colis porté
-- à moto vers une commune éloignée, 14 700 pour le même trajet en véhicule.
--
-- Elles sont volontairement appliquées à toutes les communes, y compris les
-- plus proches : surfacturer se corrige en baissant un chiffre, sous-facturer
-- se paie sur chaque commande sans qu'on s'en aperçoive. À remplacer par la
-- grille réelle du transporteur dès qu'elle est connue.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES shipping_fees(id) ON DELETE CASCADE,
  parcel_size TEXT NOT NULL REFERENCES parcel_sizes(code) ON DELETE CASCADE,
  price_fcfa INTEGER NOT NULL CHECK (price_fcfa >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone_id, parcel_size)
);

CREATE INDEX IF NOT EXISTS shipping_rates_zone_idx ON shipping_rates (zone_id);

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_rates_public_read" ON shipping_rates;
CREATE POLICY "shipping_rates_public_read" ON shipping_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "shipping_rates_admin_write" ON shipping_rates;
CREATE POLICY "shipping_rates_admin_write" ON shipping_rates
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO shipping_rates (zone_id, parcel_size, price_fcfa)
SELECT z.id, p.code, p.price
FROM shipping_fees z
CROSS JOIN (VALUES
  ('petit',  3000),
  ('moyen',  3000),
  ('grand', 14700)
) AS p(code, price)
WHERE z.is_active
  AND NOT EXISTS (SELECT 1 FROM shipping_rates r WHERE r.zone_id = z.id);

-- ───────────────────────────────────────────────────────────────────────────
-- Taille de colis des produits
--
-- Sans taille, un article passerait pour un petit colis et la livraison serait
-- sous-facturée. L'administration signale les produits non renseignés.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS parcel_size TEXT
  REFERENCES parcel_sizes(code) ON DELETE SET NULL;

COMMENT ON COLUMN products.parcel_size IS
  'Taille de colis. Vide = la taille par défaut des réglages est utilisée.';

-- Un écran ou une tour n'entrent pas dans un sac à dos de moto : ce n'est pas
-- une estimation commerciale mais un fait d'encombrement, donc on le pose.
UPDATE products SET parcel_size = 'grand'
WHERE parcel_size IS NULL AND category IN ('ecrans', 'bureau');

UPDATE products SET parcel_size = 'moyen'
WHERE parcel_size IS NULL AND category = 'portable';

-- ───────────────────────────────────────────────────────────────────────────
-- Commande : position et mode de livraison
--
-- La position n'est renseignée que si le client a accepté de la partager. Elle
-- n'entre pas dans le calcul du prix — elle sert à ce que le livreur retrouve
-- le client, ce qu'une adresse écrite ne permet pas toujours à Abidjan.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_accuracy_m INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_parcel_size TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT
  CHECK (delivery_mode IN ('livraison', 'retrait'));

-- ───────────────────────────────────────────────────────────────────────────
-- Réglages
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  -- Taille retenue pour un produit qui n'en a pas. « moyen » plutôt que
  -- « petit » : mieux vaut surfacturer une souris que sous-facturer un écran.
  ('default_parcel_size', 'moyen'),

  -- Le retrait sur place : la seule option qui échappe au coût du transport,
  -- indispensable dès qu'un colis encombrant fait grimper la livraison.
  ('pickup_enabled', 'true'),
  ('pickup_address', NULL),
  ('pickup_hours', NULL)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
