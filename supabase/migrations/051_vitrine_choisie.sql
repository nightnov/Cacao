-- Choix des produits mis en avant sur l'accueil.
--
-- La section « meilleures ventes » se remplissait toute seule, au nombre de
-- vues. Sur un petit catalogue, cela revient à tout afficher : un produit
-- ajouté le matin se retrouvait en vitrine l'après midi, quelle que soit la
-- qualité de sa photo. La vitrine est la première chose que voit un visiteur,
-- elle ne peut pas être subie.

-- Marque de mise en avant, par produit.
--
-- Faux par défaut : un produit nouvellement créé n'entre pas en vitrine sans
-- décision. C'est exactement le comportement demandé — rien ne s'y invite.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mis_en_avant BOOLEAN NOT NULL DEFAULT false;

-- Ordre d'affichage en vitrine. Les produits sans rang suivent, classés par
-- popularité comme avant.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rang_vitrine INTEGER;

-- Index partiel : la vitrine ne lit qu'une poignée de lignes sur l'ensemble
-- du catalogue, inutile d'indexer les produits non retenus.
CREATE INDEX IF NOT EXISTS idx_products_mis_en_avant
  ON products (rang_vitrine) WHERE mis_en_avant;

-- Mode de remplissage de la vitrine : « auto » ou « choisi ».
--
-- « auto » conserve le comportement actuel, au nombre de vues. C'est la valeur
-- posée ici, pour que l'accueil ne change pas d'aspect au moment où cette
-- migration passe : un site dont la vitrine se vide sans prévenir est pire que
-- le problème qu'on corrige.
INSERT INTO site_settings (key, value)
VALUES ('vitrine_mode', 'auto')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
