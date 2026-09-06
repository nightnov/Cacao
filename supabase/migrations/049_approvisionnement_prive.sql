-- Où aller chercher la marchandise, hors de portée du client.
--
-- Ces informations vivaient jusqu'ici dans `products` et `product_variants`,
-- deux tables dont la lecture est publique. La règle de sécurité au niveau des
-- lignes autorise ou refuse une ligne entière, jamais une colonne : n'importe
-- quel visiteur pouvait donc demander `supplier_url` ou `supplier_cost_fcfa` et
-- obtenir l'adresse du revendeur et le prix d'achat.
--
-- Les déplacer dans des tables séparées, sans aucune règle de lecture publique,
-- est la seule protection qui ne dépende pas de ce que le code pense demander.

CREATE TABLE IF NOT EXISTS product_sourcing (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  -- Adresse de la fiche d'origine, sur la plateforme où la pièce s'achète.
  source_url TEXT,
  -- Nom lisible de cette plateforme. Déduit de l'adresse, corrigeable à la main.
  platform TEXT,
  -- Référence chez le revendeur, quand elle existe.
  external_id TEXT,
  -- Prix d'achat. Ne sort jamais de l'administration.
  cost_fcfa INTEGER,
  note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variant_sourcing (
  variant_id UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  cost_fcfa INTEGER
);

-- Reprise de ce qui existe déjà, avant de retirer les colonnes.
INSERT INTO product_sourcing (product_id, source_url, platform, external_id, cost_fcfa)
SELECT id, supplier_url, supplier_name, supplier_product_id, supplier_cost_fcfa
FROM products
WHERE supplier_url IS NOT NULL
   OR supplier_name IS NOT NULL
   OR supplier_product_id IS NOT NULL
   OR supplier_cost_fcfa IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO variant_sourcing (variant_id, cost_fcfa)
SELECT id, supplier_cost_fcfa FROM product_variants WHERE supplier_cost_fcfa IS NOT NULL
ON CONFLICT (variant_id) DO NOTHING;

ALTER TABLE products DROP COLUMN IF EXISTS supplier_url;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_name;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_product_id;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_cost_fcfa;
ALTER TABLE product_variants DROP COLUMN IF EXISTS supplier_cost_fcfa;

-- Aucune règle de lecture publique n'est créée : sans règle, personne ne lit.
ALTER TABLE product_sourcing ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_sourcing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_sourcing_admin" ON product_sourcing;
CREATE POLICY "product_sourcing_admin" ON product_sourcing FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "variant_sourcing_admin" ON variant_sourcing;
CREATE POLICY "variant_sourcing_admin" ON variant_sourcing FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

NOTIFY pgrst, 'reload schema';
