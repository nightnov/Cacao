-- Étend les catégories informatique réelles (Gaming, Écrans, Composants, Stockage,
-- Imprimantes) pour que l'admin puisse les sélectionner dès maintenant lors de
-- l'ajout de produits — les sections publiques correspondantes restent masquées
-- tant qu'aucun produit n'existe dans la catégorie (pas de contenu inventé).
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('portable', 'bureau', 'gaming', 'ecrans', 'accessoire', 'composants', 'stockage', 'imprimantes'));
