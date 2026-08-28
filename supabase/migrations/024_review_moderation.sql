-- ═══════════════════════════════════════════════════════════════════════════
-- Modération des avis
--
-- Aujourd'hui un avis est publié dès qu'il est écrit, sans aucun recours : un
-- commentaire injurieux ou un règlement de comptes reste en ligne tant que son
-- auteur ne le retire pas lui-même.
--
-- Choix retenu : modération A POSTERIORI. L'avis paraît immédiatement, et
-- l'exploitant peut le masquer. L'inverse — exiger une validation avant
-- publication — a un défaut sérieux pour une boutique tenue par une seule
-- personne : les avis disparaissent tant que personne ne les traite, et un
-- client qui vient d'écrire ne voit pas son texte. Rien n'empêche de basculer
-- plus tard, mais ce doit être un choix explicite.
-- ═══════════════════════════════════════════════════════════════════════════

-- Défaut à `false` : tous les avis déjà en base restent visibles. Un défaut à
-- « masqué » aurait vidé la boutique de ses avis au moment de la migration.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS reviews_visible_idx ON reviews (product_id) WHERE NOT is_hidden;

-- La lecture publique exclut les avis masqués. L'administrateur voit tout,
-- sinon il ne pourrait plus republier ce qu'il vient de masquer.
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (
    NOT is_hidden
    OR auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'
    OR auth.uid() = user_id
  );

-- L'auteur garde la main sur son propre avis, mais ne doit pas pouvoir le
-- démasquer lui-même — sinon la modération ne servirait à rien.
DROP POLICY IF EXISTS "reviews_admin_moderate" ON reviews;
CREATE POLICY "reviews_admin_moderate" ON reviews
  FOR UPDATE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- La note moyenne doit ignorer les avis masqués, sans quoi masquer un « 1/5 »
-- injurieux laisserait quand même la note du produit au plancher.
DROP VIEW IF EXISTS product_ratings;
CREATE VIEW product_ratings
  WITH (security_invoker = true) AS
  SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS review_count
  FROM reviews
  WHERE NOT is_hidden
  GROUP BY product_id;

GRANT SELECT ON product_ratings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
