-- ═══════════════════════════════════════════════════════════════════════════
-- Ce qui est livré avec la machine
--
-- Le même modèle arrive parfois avec un clavier et une souris, parfois seul,
-- parfois dans son carton d'origine, parfois avec une sacoche. Rien dans la
-- fiche ne permettait de le dire : ces accessoires finissaient dans la
-- description libre, où ils se perdent, ou nulle part.
--
-- C'est pourtant ce qui décide entre deux annonces au même prix, et c'est la
-- première source de réclamation quand le client s'attendait à un clavier
-- qu'il n'a pas reçu.
--
-- Une liste de textes libres plutôt qu'une table de cases à cocher : les
-- accessoires changent d'un arrivage à l'autre, et une liste figée obligerait
-- une migration à chaque nouveauté. « Sacoche de transport » se saisit et
-- s'affiche tel quel.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS included_items TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.included_items IS
  'Ce qui est livré avec l''appareil : chargeur, souris, sacoche, carton d''origine. Vide = rien d''annoncé, donc rien de promis.';

NOTIFY pgrst, 'reload schema';
