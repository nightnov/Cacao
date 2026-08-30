-- ═══════════════════════════════════════════════════════════════════════════
-- Visuel et accroche par rayon
--
-- Les cartes « Choisissez votre gamme » affichaient une icône de trait, la même
-- pour tous. Une photo de machine dit en un coup d'œil ce que contient le rayon,
-- et permet d'agrandir la carte sans qu'elle paraisse vide.
--
-- L'image est téléversée depuis l'administration : personne ne doit passer par
-- le code pour changer la photo d'un rayon.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Accroche courte affichée sous le titre de la carte. Distincte de
-- `description`, qui coiffe la page catalogue et peut être plus longue.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMENT ON COLUMN categories.image_url IS
  'Photo affichée sur la carte de gamme de l''accueil. Vide = repli sur l''icône.';

-- Accroches de départ, reprises de celles qui étaient écrites dans le code.
UPDATE categories SET tagline = 'Mobilité et autonomie pour le travail et les études'
  WHERE value = 'portable' AND tagline IS NULL;
UPDATE categories SET tagline = 'Unités centrales, puissance stable pour un poste fixe'
  WHERE value = 'bureau' AND tagline IS NULL;
UPDATE categories SET tagline = 'Machines dédiées au jeu, cartes et écrans à haute fréquence'
  WHERE value = 'gaming' AND tagline IS NULL;
UPDATE categories SET tagline = 'Claviers, souris, casques, sacoches et câbles'
  WHERE value = 'accessoire' AND tagline IS NULL;
UPDATE categories SET tagline = 'Moniteurs pour le bureau comme pour le jeu'
  WHERE value = 'ecrans' AND tagline IS NULL;

NOTIFY pgrst, 'reload schema';
