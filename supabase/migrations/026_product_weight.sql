-- ═══════════════════════════════════════════════════════════════════════════
-- Poids du produit, en appui de la taille de colis
--
-- La taille de colis reste ce qui détermine le prix — c'est elle que facture
-- le transporteur. Le poids sert à la déduire sans avoir à retenir les seuils :
-- saisir « 2,3 kg » propose « petit colis ».
--
-- Les deux colonnes coexistent volontairement. Le poids seul ne suffit pas :
-- un écran de 27 pouces pèse 5 kg mais ne rentre dans aucune boîte de moyen
-- colis. La proposition reste donc modifiable à la main.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2);

COMMENT ON COLUMN products.weight_kg IS
  'Poids emballé en kg. Sert à proposer la taille de colis ; c''est parcel_size qui fait foi pour le prix.';

NOTIFY pgrst, 'reload schema';
