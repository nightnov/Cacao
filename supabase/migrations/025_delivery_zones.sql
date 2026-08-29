-- ═══════════════════════════════════════════════════════════════════════════
-- Livraison : zones, taille de colis et position du client
--
-- Ce que corrige cette migration :
--
-- 1. Abidjan était facturée 5 000 FCFA d'un bloc. Le tarif réel d'un colis
--    moyen à l'intérieur d'Abidjan est de 1 300 FCFA : les clients payaient
--    près de quatre fois le coût de leur livraison.
--
-- 2. Le prix ne dépendait pas de l'encombrement. Un clavier et un écran de
--    24 pouces coûtaient pareil à livrer, alors que les grilles réelles vont
--    de 750 à 4 500 FCFA pour le même trajet selon la taille du colis.
--
-- Le modèle reprend celui des transporteurs locaux : une grille croisant une
-- zone de départ, une zone d'arrivée et trois tailles de colis.
--
-- AUCUN TRANSPORTEUR N'EST NOMMÉ, ni en base ni côté client. Le site affiche
-- « Livraison » et un prix ; qui porte réellement le colis se décide commande
-- par commande. Le prestataire peut changer sans qu'une ligne de code bouge —
-- seuls les chiffres de la grille sont à reprendre.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Tailles de colis
--
-- Dimensions et fourchettes de poids recopiées d'une grille réelle. Elles
-- servent de repère pour classer un produit, et sont affichées au client.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_sizes (
  code TEXT PRIMARY KEY CHECK (code IN ('petit', 'moyen', 'grand')),
  label TEXT NOT NULL,
  weight_range TEXT,
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

INSERT INTO parcel_sizes (code, label, weight_range, dimensions, examples, sort_order) VALUES
  ('petit', 'Petit colis', '0 – 5 kg',   '40 × 20 × 13 cm',  'Clavier, souris, casque, câbles', 1),
  ('moyen', 'Moyen colis', '5 – 15 kg',  '70 × 30 × 20 cm',  'Ordinateur portable, imprimante', 2),
  ('grand', 'Grand colis', '15 – 30 kg', '100 × 100 × 62 cm','Écran, tour de bureau, config gamer', 3)
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Zones tarifaires
--
-- Six zones, du district d'Abidjan aux localités les plus éloignées. Tout
-- Abidjan appartient à la même zone : découper par commune n'aurait aucun
-- effet sur le prix, les communes restent seulement utiles pour l'adresse.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_zones (
  number INT PRIMARY KEY CHECK (number BETWEEN 1 AND 6),
  label TEXT NOT NULL,
  localities TEXT
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_zones_public_read" ON delivery_zones;
CREATE POLICY "delivery_zones_public_read" ON delivery_zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "delivery_zones_admin_write" ON delivery_zones;
CREATE POLICY "delivery_zones_admin_write" ON delivery_zones
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO delivery_zones (number, label, localities) VALUES
  (1, 'Zone 1 — District d''Abidjan', 'Abidjan, Akoupé Zeudji, Anyama, Attingue, Bingerville, Songon'),
  (2, 'Zone 2 — Couronne d''Abidjan', 'Adiaké, Agboville, Alépé, Assinie, Azaguié, Bonoua, Dabou, Grand-Bassam, Jacqueville, Kofikro, NDjem, Sikensi, Toukouzou, Toupah, Yaou'),
  (3, 'Zone 3 — Grandes villes', 'Abengourou, Aboisso, Agnibilékrou, Bondoukou, Bouaflé, Bouaké, Daloa, Daoukro, Divo, Duékoué, Gagnoa, Guiglo, Korhogo, Man, Ouangolodougou, San-Pédro, Séguéla, Soubré, Yamoussoukro'),
  (4, 'Zone 4 — Villes secondaires', 'Adzopé, Affery, Agou, Akoupé, Dimbokro, Fresco, Grand-Lahou, Lakota, Oumé, Sassandra, Tiassalé, Toumodi…'),
  (5, 'Zone 5 — Localités éloignées', 'Béoumi, Buyo, Ferkessédougou, Katiola, Odienné, Sakassou, Sinfra, Tanda, Vavoua, Zuénoula…'),
  (6, 'Zone 6 — Localités très éloignées', 'Bangolo, Biankouman, Boundiali, Danané, Dabakala, Kong, Tabou, Touba, Toulepleu, Transua…')
ON CONFLICT (number) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Grille tarifaire : départ × arrivée × taille
--
-- Valeurs relevées sur une grille publiée. Le trajet le plus courant pour une
-- boutique installée à Abidjan est Zone 1 → Zone 1 : 750 / 1 300 / 4 500 FCFA.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_zone INT NOT NULL REFERENCES delivery_zones(number) ON DELETE CASCADE,
  to_zone INT NOT NULL REFERENCES delivery_zones(number) ON DELETE CASCADE,
  parcel_size TEXT NOT NULL REFERENCES parcel_sizes(code) ON DELETE CASCADE,
  price_fcfa INTEGER NOT NULL CHECK (price_fcfa >= 0),

  -- Délai indicatif en jours ouvrés, tel qu'annoncé par le transporteur. Il
  -- n'engage à rien : c'est une estimation, pas une promesse de la boutique.
  delay_days INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_zone, to_zone, parcel_size)
);

CREATE INDEX IF NOT EXISTS shipping_rates_route_idx ON shipping_rates (from_zone, to_zone);

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_rates_public_read" ON shipping_rates;
CREATE POLICY "shipping_rates_public_read" ON shipping_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "shipping_rates_admin_write" ON shipping_rates;
CREATE POLICY "shipping_rates_admin_write" ON shipping_rates
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO shipping_rates (from_zone, to_zone, parcel_size, price_fcfa, delay_days)
SELECT g.f, g.t, s.code, s.price, g.delay
FROM (VALUES
  (1, 1, 2), (1, 2, 3), (1, 3, 4), (1, 4, 5), (1, 5, 5), (1, 6, 5),
  (2, 2, 5), (2, 3, 6), (2, 4, 6), (2, 5, 7), (2, 6, 7),
  (3, 3, 7), (3, 4, 7), (3, 5, 8), (3, 6, 8),
  (4, 4, 7), (4, 5, 8), (4, 6, 8),
  (5, 5, 9), (5, 6, 9),
  (6, 6, 9)
) AS g(f, t, delay)
JOIN LATERAL (VALUES
  ('petit', CASE
     WHEN g.f = 1 AND g.t = 1 THEN 750  WHEN g.f = 1 AND g.t = 2 THEN 900
     WHEN g.f = 1 AND g.t IN (3,4,5)   THEN 1000 WHEN g.f = 1 AND g.t = 6 THEN 2500
     WHEN g.f = 2 AND g.t = 2 THEN 1100 WHEN g.f = 2 AND g.t IN (3,4,5) THEN 1400
     WHEN g.f = 2 AND g.t = 6 THEN 3000
     WHEN g.f = 3 AND g.t IN (3,4,5)   THEN 2000 WHEN g.f = 3 AND g.t = 6 THEN 3500
     WHEN g.f = 4 AND g.t IN (4,5)     THEN 2000 WHEN g.f = 4 AND g.t = 6 THEN 4000
     WHEN g.f = 5 AND g.t = 5 THEN 2000 WHEN g.f = 5 AND g.t = 6 THEN 4000
     ELSE 5000 END),
  ('moyen', CASE
     WHEN g.f = 1 AND g.t = 1 THEN 1300 WHEN g.f = 1 AND g.t = 2 THEN 1500
     WHEN g.f = 1 AND g.t IN (3,4,5)   THEN 1900 WHEN g.f = 1 AND g.t = 6 THEN 5000
     WHEN g.f = 2 AND g.t = 2 THEN 2000 WHEN g.f = 2 AND g.t IN (3,4,5) THEN 2500
     WHEN g.f = 2 AND g.t = 6 THEN 4600
     WHEN g.f = 3 AND g.t IN (3,4,5)   THEN 3300 WHEN g.f = 3 AND g.t = 6 THEN 5500
     WHEN g.f = 4 AND g.t IN (4,5)     THEN 3300 WHEN g.f = 4 AND g.t = 6 THEN 6500
     WHEN g.f = 5 AND g.t = 5 THEN 3300 WHEN g.f = 5 AND g.t = 6 THEN 6500
     ELSE 8500 END),
  ('grand', CASE
     WHEN g.f = 1 AND g.t = 1 THEN 4500 WHEN g.f = 1 AND g.t = 2 THEN 5500
     WHEN g.f = 1 AND g.t IN (3,4)     THEN 7500 WHEN g.f = 1 AND g.t = 5 THEN 10000
     WHEN g.f = 1 AND g.t = 6 THEN 11000
     WHEN g.f = 2 AND g.t = 2 THEN 6000 WHEN g.f = 2 AND g.t IN (4,5) THEN 10000
     WHEN g.f = 2 AND g.t = 3 THEN 8000 WHEN g.f = 2 AND g.t = 6 THEN 12000
     WHEN g.f = 2 AND g.t = 5 THEN 11000
     WHEN g.f = 3 AND g.t = 3 THEN 9500 WHEN g.f = 3 AND g.t IN (4,5) THEN 12000
     WHEN g.f = 3 AND g.t = 6 THEN 15000
     WHEN g.f = 4 AND g.t IN (4,5)     THEN 12000 WHEN g.f = 4 AND g.t = 6 THEN 15000
     WHEN g.f = 5 AND g.t = 5 THEN 12000 WHEN g.f = 5 AND g.t = 6 THEN 15000
     ELSE 18000 END)
) AS s(code, price) ON true
WHERE NOT EXISTS (SELECT 1 FROM shipping_rates);

-- ───────────────────────────────────────────────────────────────────────────
-- Localités livrables, rattachées à leur zone
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS zone_number INT
  REFERENCES delivery_zones(number) ON DELETE SET NULL;
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE shipping_fees ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Les communes d'Abidjan sont toutes en zone 1 : même prix partout. Elles ne
-- servent qu'à préciser l'adresse pour le livreur.
INSERT INTO shipping_fees (city, price_fcfa, zone_number, sort_order)
SELECT * FROM (VALUES
  ('Abidjan — Abobo',        1300, 1,  1),
  ('Abidjan — Adjamé',       1300, 1,  2),
  ('Abidjan — Attécoubé',    1300, 1,  3),
  ('Abidjan — Cocody',       1300, 1,  4),
  ('Abidjan — Koumassi',     1300, 1,  5),
  ('Abidjan — Marcory',      1300, 1,  6),
  ('Abidjan — Plateau',      1300, 1,  7),
  ('Abidjan — Port-Bouët',   1300, 1,  8),
  ('Abidjan — Treichville',  1300, 1,  9),
  ('Abidjan — Yopougon',     1300, 1, 10),
  ('Abidjan — Bingerville',  1300, 1, 11),
  ('Abidjan — Anyama',       1300, 1, 12),
  ('Abidjan — Songon',       1300, 1, 13),
  ('Grand-Bassam',           1500, 2, 20),
  ('Dabou',                  1500, 2, 21),
  ('Agboville',              1500, 2, 22),
  ('Bonoua',                 1500, 2, 23),
  ('Jacqueville',            1500, 2, 24),
  ('Alépé',                  1500, 2, 25),
  ('Adiaké',                 1500, 2, 26),
  ('Assinie',                1500, 2, 27),
  ('Azaguié',                1500, 2, 28),
  ('Sikensi',                1500, 2, 29),
  ('Abengourou',             1900, 3, 40),
  ('Aboisso',                1900, 3, 41),
  ('Bondoukou',              1900, 3, 42),
  ('Bouaflé',                1900, 3, 43),
  ('Divo',                   1900, 3, 44),
  ('Duékoué',                1900, 3, 45),
  ('Gagnoa',                 1900, 3, 46),
  ('Korhogo',                1900, 3, 47),
  ('Man',                    1900, 3, 48),
  ('Séguéla',                1900, 3, 49),
  ('Soubré',                 1900, 3, 50)
) AS seed(city, price_fcfa, zone_number, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shipping_fees WHERE zone_number IS NOT NULL);

-- Les villes déjà présentes reçoivent leur zone. San-Pédro, Bouaké, Daloa et
-- Yamoussoukro figurent en zone 3 sur la grille relevée.
UPDATE shipping_fees SET zone_number = 3, price_fcfa = 1900, sort_order = 60
WHERE zone_number IS NULL AND city IN ('Bouaké', 'Daloa', 'San-Pédro', 'Yamoussoukro');

-- L'ancienne entrée « Abidjan » sort du choix mais reste en base : la
-- supprimer ferait recalculer à zéro les commandes qui la désignent.
UPDATE shipping_fees SET is_active = false, zone_number = 1
WHERE city = 'Abidjan';

-- ───────────────────────────────────────────────────────────────────────────
-- Taille de colis des produits
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS parcel_size TEXT
  REFERENCES parcel_sizes(code) ON DELETE SET NULL;

COMMENT ON COLUMN products.parcel_size IS
  'Taille de colis. Vide = la taille par défaut des réglages est utilisée.';

-- Un écran ou une tour dépassent la boîte « moyen colis » : c'est un fait
-- d'encombrement, pas une estimation commerciale.
UPDATE products SET parcel_size = 'grand'
WHERE parcel_size IS NULL AND category IN ('ecrans', 'bureau');

-- « Ordinateurs » figure explicitement dans les exemples du moyen colis.
UPDATE products SET parcel_size = 'moyen'
WHERE parcel_size IS NULL AND category IN ('portable', 'gaming', 'imprimantes');

UPDATE products SET parcel_size = 'petit'
WHERE parcel_size IS NULL AND category IN ('accessoire', 'composants', 'stockage');

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
  -- Zone d'où partent les colis. La boutique expédie depuis Abidjan, donc 1.
  ('pickup_zone', '1'),

  -- Taille retenue pour un produit qui n'en a pas. « moyen » plutôt que
  -- « petit » : mieux vaut surfacturer une souris que sous-facturer un écran.
  ('default_parcel_size', 'moyen'),

  -- Le retrait sur place : la seule option qui échappe au coût du transport,
  -- utile dès qu'un grand colis fait grimper la livraison.
  ('pickup_enabled', 'true'),
  ('pickup_address', NULL),
  ('pickup_hours', NULL)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
