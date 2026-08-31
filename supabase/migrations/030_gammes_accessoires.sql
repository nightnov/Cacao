-- ═══════════════════════════════════════════════════════════════════════════
-- Les quatre gammes : Portables, Bureau, Gaming, Accessoires
--
-- L'accueil met en avant les quatre premiers rayons. « Écrans » y occupait la
-- quatrième place ; il cède la sienne à « Accessoires », qui regroupe désormais
-- écrans, claviers, souris, casques, sacoches et câbles.
--
-- « Écrans » est masqué plutôt que supprimé : le supprimer effacerait le rayon
-- de tout produit qui y serait classé plus tard, et rien n'empêche de le
-- réafficher depuis Rayons si l'assortiment grandit.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE categories SET sort_order = 4 WHERE value = 'accessoire';

-- Repoussé et retiré des menus, mais conservé en base.
UPDATE categories SET sort_order = 9, is_visible = false WHERE value = 'ecrans';

-- Les accroches décrivent ce que le rayon contient réellement, maintenant que
-- les écrans y sont rattachés et que « Bureau » désigne les postes fixes.
UPDATE categories
SET tagline = 'Mobilité et autonomie pour le travail et les études',
    description = 'Ordinateurs portables neufs et reconditionnés, livrés partout en Côte d''Ivoire.'
WHERE value = 'portable';

UPDATE categories
SET short_label = 'Bureau',
    label = 'PC Bureau',
    tagline = 'Unités centrales et postes fixes pour un usage quotidien',
    description = 'Ordinateurs fixes et unités centrales, pour le bureau comme pour la maison.'
WHERE value = 'bureau';

UPDATE categories
SET tagline = 'Machines et configurations dédiées au jeu',
    description = 'Portables et configurations pensés pour le jeu.'
WHERE value = 'gaming';

UPDATE categories
SET tagline = 'Écrans, claviers, souris, casques et câbles',
    description = 'Tout ce qui complète une machine : écrans, périphériques et connectique.'
WHERE value = 'accessoire';

NOTIFY pgrst, 'reload schema';
