-- ═══════════════════════════════════════════════════════════════════════════
-- Configuration produit : un supplément par valeur, et non un prix par
-- combinaison
--
-- Le modèle précédent (`product_variants`) demandait un prix par combinaison
-- complète. Avec Couleur, Stockage, RAM et Processeur à trois valeurs chacun,
-- cela faisait 81 lignes à saisir à la main pour un seul produit.
--
-- Ici, chaque VALEUR porte son écart de prix, et le prix affiché vaut
-- « prix de base + somme des écarts choisis ». Douze lignes suffisent pour le
-- même produit, et ajouter une couleur n'oblige pas à ressaisir le reste.
--
-- Chaque valeur porte aussi son propre bloc explicatif : c'est ce qui permet
-- d'afficher, sous la fiche, un texte adapté à la configuration réellement
-- choisie — « ce que permettent 16 Go de RAM » plutôt qu'un texte général.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Options (Couleur, Stockage, RAM, Processeur…) ─────────────────────────
CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Deux options du même nom sur un même produit n'auraient pas de sens et
  -- rendraient la sélection ambiguë.
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS product_options_product_idx
  ON product_options (product_id, sort_order);

-- ── Valeurs d'une option ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  label TEXT NOT NULL,

  -- Écart appliqué au prix de base. Signé : un supplément est positif, une
  -- réduction négative. C'est cette colonne, relue côté serveur au moment du
  -- paiement, qui fait foi — jamais le montant calculé dans le navigateur.
  price_delta_fcfa INTEGER NOT NULL DEFAULT 0,

  -- Visuel du produit dans cette valeur. Quand il existe, choisir la valeur
  -- remplace l'image principale de la galerie.
  image_url TEXT,

  -- Phrase courte affichée sous le sélecteur.
  description TEXT,

  -- Bloc détaillé de la section « Description », propre à cette valeur.
  block_title TEXT,
  block_image_url TEXT,
  block_body TEXT,

  -- Une valeur inactive reste en base — les commandes passées y font
  -- référence — mais disparaît des sélecteurs.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Valeur présélectionnée à l'ouverture de la fiche.
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_option_values_option_idx
  ON product_option_values (option_id, sort_order);

-- Une seule valeur par défaut par option : deux valeurs par défaut rendraient
-- la sélection d'ouverture dépendante de l'ordre de lecture.
CREATE UNIQUE INDEX IF NOT EXISTS product_option_values_one_default_idx
  ON product_option_values (option_id) WHERE is_default;

ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_options_public_read" ON product_options;
CREATE POLICY "product_options_public_read" ON product_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_options_admin_all" ON product_options;
CREATE POLICY "product_options_admin_all" ON product_options
  FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "product_option_values_public_read" ON product_option_values;
CREATE POLICY "product_option_values_public_read" ON product_option_values
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_option_values_admin_all" ON product_option_values;
CREATE POLICY "product_option_values_admin_all" ON product_option_values
  FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- ── Accroche commerciale ──────────────────────────────────────────────────
-- Distincte de `description`, qui est le texte long de la section repliable.
-- Celle-ci tient en une ou deux phrases sous le nom du produit.
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;

COMMENT ON COLUMN products.short_description IS
  'Une ou deux phrases affichées sous le nom sur la fiche produit.';

-- ── Configuration retenue sur une ligne de commande ───────────────────────
-- Les identifiants sont conservés, et non les libellés : c'est à partir d'eux
-- que le serveur relit les suppléments réels au moment du paiement.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS option_value_ids UUID[];

COMMENT ON COLUMN order_items.option_value_ids IS
  'Valeurs d''option choisies. Le serveur relit leur supplément en base : le montant venu du navigateur n''est jamais utilisé.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Avis : réservés à un produit réellement reçu
--
-- N'importe quel compte connecté pouvait noter n'importe quel produit, sans
-- l'avoir acheté. La règle est posée en base et non seulement dans la page :
-- une politique RLS s'applique quelle que soit la façon dont la requête
-- arrive, y compris hors du site.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION has_delivered_order(p_user UUID, p_product UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = p_user
      AND oi.product_id = p_product
      AND o.status = 'delivered'
  );
$$;

GRANT EXECUTE ON FUNCTION has_delivered_order(UUID, UUID) TO anon, authenticated;

-- L'ancienne politique laissait écrire tout utilisateur authentifié.
DROP POLICY IF EXISTS "reviews_user_manage_own" ON reviews;

DROP POLICY IF EXISTS "reviews_insert_after_delivery" ON reviews;
CREATE POLICY "reviews_insert_after_delivery" ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_delivered_order(auth.uid(), product_id));

-- Modifier ou retirer son propre avis reste possible sans nouvelle commande :
-- la condition portait sur le droit d'écrire, pas sur celui de se corriger.
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
