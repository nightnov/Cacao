-- ═══════════════════════════════════════════════════════════════════════════
-- Un seul menu sur tout le site : cinq rayons
--
-- La base publiait sept rayons visibles (Portables, Bureau, Gaming,
-- Accessoires, Composants, Stockage, Imprimantes) tandis que l'accueil n'en
-- montre que les quatre premiers. Le catalogue et les pages de rayon en
-- affichaient donc davantage que la page d'accueil.
--
-- Le menu retenu est : PC Portables, PC Bureau, Gaming, Accessoires, Composants.
--
-- « Stockage » et « Imprimantes » sont masqués, non supprimés : les masquer les
-- retire des menus et des filtres, tout en gardant leur libellé disponible si
-- un produit y était rangé. Une suppression aurait cassé la référence.
-- ═══════════════════════════════════════════════════════════════════════════

-- Garde-fou : on ne masque un rayon que s'il ne contient aucun produit publié.
-- Masquer un rayon qui a des produits les rendrait inatteignables depuis la
-- navigation sans que personne ne s'en aperçoive.
UPDATE categories c
SET is_visible = FALSE
WHERE c.value IN ('stockage', 'imprimantes')
  AND NOT EXISTS (
    SELECT 1 FROM products p
    WHERE p.category = c.value
      AND p.status = 'active'
  );

-- « Écrans » avait déjà été masqué en migration 030 ; on le confirme ici pour
-- que ce fichier décrive à lui seul l'état attendu du menu.
UPDATE categories SET is_visible = FALSE WHERE value = 'ecrans';

-- Ordre d'affichage, sans trou : c'est celui repris par l'accueil, le
-- catalogue, le menu et le pied de page.
UPDATE categories SET sort_order = 1 WHERE value = 'portable';
UPDATE categories SET sort_order = 2 WHERE value = 'bureau';
UPDATE categories SET sort_order = 3 WHERE value = 'gaming';
UPDATE categories SET sort_order = 4 WHERE value = 'accessoire';
UPDATE categories SET sort_order = 5 WHERE value = 'composants';

NOTIFY pgrst, 'reload schema';
