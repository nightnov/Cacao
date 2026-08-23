-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION DE RATTRAPAGE
--
-- Diagnostic du 2026-08-23 : les migrations 009, 013, 014 et 015 n'avaient
-- jamais été exécutées sur la base de production. Résultat : les tables
-- site_settings, favorites, newsletter_subscribers et reviews étaient absentes,
-- ce qui provoquait des erreurs 404 (PGRST205) sur la page compte, le footer
-- (liens réseaux sociaux) et le formulaire newsletter de l'accueil.
--
-- Ce fichier regroupe ces 4 migrations en une seule à exécuter. Il est
-- entièrement idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT) :
-- l'exécuter plusieurs fois ne casse rien et ne supprime aucune donnée.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 009 · Réglages du site (clé/valeur) ────────────────────────────────────
-- Utilisé par : bannière promo de l'accueil, liens réseaux sociaux du footer.
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write" ON site_settings
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO site_settings (key, value) VALUES ('homepage_banner_url', NULL)
ON CONFLICT (key) DO NOTHING;


-- ─── 013 · Favoris clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_user_manage_own" ON favorites;
CREATE POLICY "favorites_user_manage_own" ON favorites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);


-- ─── 014 · Inscriptions newsletter ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_public_insert" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_admin_select" ON newsletter_subscribers;
CREATE POLICY "newsletter_admin_select" ON newsletter_subscribers
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');


-- ─── 015 · Avis clients ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_user_manage_own" ON reviews;
CREATE POLICY "reviews_user_manage_own" ON reviews
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Vue agrégée (note moyenne + nombre d'avis) pour éviter le N+1 sur les grilles.
-- security_invoker = true : la vue applique les droits de celui qui l'interroge.
-- Sans risque ici puisque `reviews` est déjà en lecture publique, et ça évite
-- l'alerte "Security Definer View" du contrôleur de sécurité Supabase.
DROP VIEW IF EXISTS product_ratings;
CREATE VIEW product_ratings
  WITH (security_invoker = true) AS
  SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS review_count
  FROM reviews
  GROUP BY product_id;

GRANT SELECT ON product_ratings TO anon, authenticated;


-- ─── Recharge le cache de schéma de l'API ───────────────────────────────────
NOTIFY pgrst, 'reload schema';
