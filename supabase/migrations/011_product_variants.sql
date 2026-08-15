-- Traçabilité fournisseur, statut de publication et référencement (SEO)
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_product_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost_fcfa INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'active')) DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_options JSONB DEFAULT '[]';

-- Variantes produits (couleur, taille, etc.), chacune avec son propre prix/stock/SKU
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_values JSONB NOT NULL DEFAULT '{}',
  sku TEXT,
  price_fcfa INTEGER NOT NULL,
  supplier_cost_fcfa INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_public_read" ON product_variants;
CREATE POLICY "product_variants_public_read" ON product_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_variants_admin_write" ON product_variants;
CREATE POLICY "product_variants_admin_write" ON product_variants
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Snapshot de la variante commandée: reste valable même si la variante
-- est supprimée/régénérée plus tard (variant_id passe à NULL, variant_label reste).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label TEXT;
