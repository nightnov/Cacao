-- ═══════════════════════════════════════════════════════════════════════════
-- Livraison : zones, poids et position du client
--
-- Ce que corrige cette migration :
--
-- 1. Abidjan était facturée 5 000 FCFA d'un bloc, sans distinction de commune
--    ni de contenu du colis. Un clavier et une tour de bureau coûtaient pareil.
--
-- 2. Le prix ne dépendait ni du poids ni de l'encombrement, alors que c'est
--    exactement ce qui fait le tarif chez tous les transporteurs : un colis qui
--    entre dans un sac à dos de moto n'a rien à voir avec un colis qui exige un
--    véhicule.
--
-- Choix de conception : AUCUN TRANSPORTEUR N'EST NOMMÉ, ni ici ni côté client.
-- Le site affiche « Livraison » et un prix. Qui transporte réellement le colis
-- se décide commande par commande, hors du site. Coder un transporteur en dur
-- obligerait à tout reprendre au prochain changement de prestataire.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Zones
-- ───────────────────────────────────────────────────────────────────────────

-- Rattachement d'une zone à sa ville, pour regrouper les communes d'Abidjan
-- dans le sélecteur au lieu d'une liste à plat de dix-huit entrées.
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
-- Grille poids × zone
--
-- Une ligne par tranche de poids et par zone. `max_weight_kg` est la borne
-- HAUTE incluse ; la tranche retenue est la première dont la borne couvre le
-- poids du panier.
--
-- Les prix de départ sont les seuls coûts réellement constatés à ce jour :
-- 3 000 FCFA pour un colis porté à moto vers une commune éloignée, 14 700 pour
-- le même trajet en véhicule. Ils sont volontairement appliqués à toutes les
-- communes, y compris les plus proches : surfacturer se corrige en baissant un
-- chiffre, sous-facturer se paie sur chaque commande sans qu'on s'en aperçoive.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES shipping_fees(id) ON DELETE CASCADE,

  -- NULL = tranche ouverte, sans limite haute. Au plus une par zone.
  max_weight_kg NUMERIC(6,2),
  price_fcfa INTEGER NOT NULL CHECK (price_fcfa >= 0),

  -- Appliqué à chaque kilo au-delà de la dernière tranche, pour qu'un colis
  -- très lourd produise quand même un prix au lieu de bloquer la commande.
  extra_per_kg_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (extra_per_kg_fcfa >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone_id, max_weight_kg)
);

CREATE INDEX IF NOT EXISTS shipping_rates_zone_idx
  ON shipping_rates (zone_id, max_weight_kg NULLS LAST);

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_rates_public_read" ON shipping_rates;
CREATE POLICY "shipping_rates_public_read" ON shipping_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "shipping_rates_admin_write" ON shipping_rates;
CREATE POLICY "shipping_rates_admin_write" ON shipping_rates
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Trois tranches pour chaque zone active, à partir des coûts constatés.
INSERT INTO shipping_rates (zone_id, max_weight_kg, price_fcfa, extra_per_kg_fcfa)
SELECT z.id, b.max_weight_kg, b.price_fcfa, b.extra_per_kg_fcfa
FROM shipping_fees z
CROSS JOIN (VALUES
  -- Portable, clavier, souris : ce qui entre dans un sac à dos de moto.
  (5.00::numeric,  3000, 0),
  -- Écran, petite tour : le véhicule devient nécessaire.
  (25.00::numeric, 14700, 0),
  -- Au-delà : même base, plus un supplément au kilo.
  (NULL::numeric,  14700, 500)
) AS b(max_weight_kg, price_fcfa, extra_per_kg_fcfa)
WHERE z.is_active
  AND NOT EXISTS (SELECT 1 FROM shipping_rates r WHERE r.zone_id = z.id);

-- ───────────────────────────────────────────────────────────────────────────
-- Poids des produits
--
-- Sans poids, un article ne pèserait rien et tomberait dans la tranche la
-- moins chère. Le repli est donc volontairement large plutôt que prudent, et
-- l'administration signale les produits dont le poids n'est pas renseigné.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2);

COMMENT ON COLUMN products.weight_kg IS
  'Poids emballé en kilogrammes. Vide = le poids par défaut des réglages est utilisé.';

-- ───────────────────────────────────────────────────────────────────────────
-- Position de livraison sur la commande
--
-- Renseignée seulement si le client a accepté de la partager. À Abidjan une
-- adresse écrite suffit rarement à retrouver quelqu'un ; un point sur la carte,
-- si. Elle sert à transmettre le lieu exact au livreur, quel qu'il soit — elle
-- n'entre pas dans le calcul du prix, qui dépend de la zone et du poids.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Précision annoncée par le navigateur, en mètres : un ordinateur qui se repère
-- au Wi-Fi peut se tromper de plusieurs kilomètres, et le point ne vaut alors
-- rien pour le livreur.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_accuracy_m INTEGER;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_weight_kg NUMERIC(7,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT
  CHECK (delivery_mode IN ('livraison', 'retrait'));

-- ───────────────────────────────────────────────────────────────────────────
-- Réglages
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  -- Poids retenu pour un produit qui n'en a pas. Trois kilos correspondent à un
  -- ordinateur portable dans son carton — sans dépasser la première tranche.
  ('default_weight_kg', '3'),

  -- Le retrait sur place : la seule option qui échappe complètement au coût du
  -- transport. Indispensable dès qu'un colis lourd fait grimper la livraison
  -- au-delà de ce qu'un client accepte de payer.
  ('pickup_enabled', 'true'),
  ('pickup_address', NULL),
  ('pickup_hours', NULL)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
