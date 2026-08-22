-- Fondation vendeur (invisible pour l'instant, un seul vendeur : CACAO).
-- Permet d'ouvrir plus tard à plusieurs vendeurs sans migration de schéma.
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers_public_read" ON sellers;
CREATE POLICY "sellers_public_read" ON sellers FOR SELECT USING (true);

DROP POLICY IF EXISTS "sellers_admin_write" ON sellers;
CREATE POLICY "sellers_admin_write" ON sellers
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO sellers (name, slug) VALUES ('CACAO', 'cacao')
  ON CONFLICT (slug) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id);
UPDATE products SET seller_id = (SELECT id FROM sellers WHERE slug = 'cacao') WHERE seller_id IS NULL;
