-- Prix barré (ancien prix) sur les produits
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price_fcfa INTEGER;

-- Historique des recherches (pour suggestions + savoir quoi ajouter au catalogue)
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_logs_public_insert" ON search_logs;
CREATE POLICY "search_logs_public_insert" ON search_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "search_logs_admin_select" ON search_logs;
CREATE POLICY "search_logs_admin_select" ON search_logs
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Vue publique agrégée (aucune donnée personnelle) pour alimenter les suggestions de recherche
CREATE OR REPLACE VIEW popular_searches AS
  SELECT query, count(*) AS search_count
  FROM search_logs
  WHERE results_count > 0
  GROUP BY query
  ORDER BY search_count DESC
  LIMIT 10;

GRANT SELECT ON popular_searches TO anon, authenticated;

-- Suivi des vues produits (pour savoir quels produits fonctionnent)
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_views_public_insert" ON product_views;
CREATE POLICY "product_views_public_insert" ON product_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "product_views_admin_select" ON product_views;
CREATE POLICY "product_views_admin_select" ON product_views
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');
