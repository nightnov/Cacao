-- ═══════════════════════════════════════════════════════════════════════════
-- Composants d'une machine
--
-- `specs` ne retient que quatre champs fixes — processeur, mémoire, stockage,
-- écran. Une configuration en compte le double : carte graphique, carte mère,
-- refroidissement, alimentation, boîtier, ventilateurs, système. Ce sont
-- précisément les lignes qu'un acheteur compare avant de se décider.
--
-- Une liste ordonnée plutôt que des colonnes : chaque machine n'a pas les
-- mêmes pièces, et en ajouter une ne doit pas demander une migration.
--
-- `specs` est conservée. Elle alimente le résumé des cartes du catalogue et
-- les filtres, qui n'ont pas besoin du détail complet.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS components JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.components IS
  'Liste ordonnée de { type, label }. `type` désigne l''icône (gpu, cpu, ram…), `label` le texte affiché.';

-- Un objet JSON mal formé afficherait une ligne vide sans que rien ne le
-- signale : la forme est donc vérifiée à l'écriture.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_components_is_array;
ALTER TABLE products ADD CONSTRAINT products_components_is_array
  CHECK (jsonb_typeof(components) = 'array');

NOTIFY pgrst, 'reload schema';
