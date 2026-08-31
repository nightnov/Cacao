-- ═══════════════════════════════════════════════════════════════════════════
-- Bandeau promotionnel de l'accueil : plusieurs images, gérées en administration
--
-- Jusqu'ici une seule image était possible (`site_settings.homepage_banner_url`),
-- et quand elle manquait, l'accueil affichait d'autorité le produit le plus
-- consulté, avec son nom, son prix et un dégradé noir. Personne n'avait choisi
-- ce contenu : il apparaissait faute de mieux.
--
-- Désormais la zone ne montre que ce qui a été publié ici. Vide, elle reste vide.
--
-- Les deux blocs de l'accueil — le texte d'accroche et le carrousel — s'activent
-- séparément (`hero_text_enabled`, `hero_carousel_enabled`). Couper le texte
-- donne toute la largeur aux images ; couper les images la rend au texte.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promo_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  -- Destination au clic. Facultative : une image d'annonce n'a pas toujours
  -- de page où mener, et un lien mort vaut moins qu'aucun lien.
  link_url TEXT,
  -- Texte alternatif, lu par les lecteurs d'écran et affiché si l'image ne
  -- charge pas. Sans lui, une bannière est un trou noir pour qui ne la voit pas.
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promo_slides_order_idx
  ON promo_slides (is_active, sort_order);

ALTER TABLE promo_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_slides_public_read" ON promo_slides;
CREATE POLICY "promo_slides_public_read" ON promo_slides
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "promo_slides_admin_all" ON promo_slides;
CREATE POLICY "promo_slides_admin_all" ON promo_slides
  FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

COMMENT ON TABLE promo_slides IS
  'Images du bandeau promotionnel de l''accueil, dans l''ordre de sort_order.';
COMMENT ON COLUMN promo_slides.link_url IS
  'Destination au clic. NULL = image non cliquable.';

-- ── Réglages de la zone d'accueil ─────────────────────────────────────────
-- Valeurs de départ choisies pour que l'accueil reste identique à l'existant
-- tant que rien n'a été publié : le texte s'affiche, le carrousel est prêt mais
-- n'a aucune image à montrer.
INSERT INTO site_settings (key, value)
VALUES
  ('hero_text_enabled', 'true'),
  ('hero_carousel_enabled', 'true'),
  -- Durée d'affichage d'une image avant de passer à la suivante.
  -- 6 s : assez pour lire une accroche, assez court pour que la deuxième
  -- image soit vue avant que le visiteur ne fasse défiler la page.
  ('hero_carousel_interval_ms', '6000')
ON CONFLICT (key) DO NOTHING;

-- L'ancienne image unique devient la première diapositive, pour ne pas
-- décrocher du jour au lendemain une bannière déjà en ligne.
INSERT INTO promo_slides (image_url, sort_order, alt_text)
SELECT value, 0, 'Offre en cours'
FROM site_settings
WHERE key = 'homepage_banner_url'
  AND value IS NOT NULL
  AND value <> ''
  AND NOT EXISTS (SELECT 1 FROM promo_slides);

-- ═══════════════════════════════════════════════════════════════════════════
-- Profondeur des thèmes : les cartes passent au-dessus du fond
--
-- Les quatre palettes livrées donnaient toutes un `bg-panel` plus SOMBRE que
-- `bg`. Une carte plus sombre que sa page se lit comme un creux, et il fallait
-- une ombre appuyée pour la décoller — d'où le rendu lourd.
--
-- L'ordre est désormais : sunken < bg < panel < raised. Le relief vient du
-- palier de teinte, l'ombre n'a plus qu'à l'asseoir.
--
-- Seules les quatre teintes de fond changent : textes, traits et accents sont
-- inchangés, et les contrastes WCAG ont été revérifiés sur les nouveaux fonds
-- (texte discret ≥ 4.5:1 sur les cartes).
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#1A1D1F","bg-panel":"#24272B","bg-sunken":"#151719","bg-raised":"#2E3237"
}'::jsonb WHERE slug = 'nuit';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#141D1B","bg-panel":"#1E2825","bg-sunken":"#101817","bg-raised":"#27332F"
}'::jsonb WHERE slug = 'noel';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#17141B","bg-panel":"#211C29","bg-sunken":"#131017","bg-raised":"#2B2434"
}'::jsonb WHERE slug = 'halloween';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#191B1F","bg-panel":"#232629","bg-sunken":"#141619","bg-raised":"#2D3035"
}'::jsonb WHERE slug = 'independance';

NOTIFY pgrst, 'reload schema';
