-- ═══════════════════════════════════════════════════════════════════════════
-- Mode de sélection d'une option : choix unique ou choix multiple
--
-- Une couleur, une capacité de mémoire et un processeur s'excluent : choisir
-- 32 Go doit remplacer 16 Go, jamais s'y ajouter. Facturer « 16 Go + 32 Go »
-- n'aurait aucun sens et gonflerait le prix d'une machine qui n'existe pas.
--
-- Le stockage fait exception : une configuration peut réellement cumuler deux
-- disques. Mais cela dépend de la machine, donc le cumul s'active option par
-- option depuis l'administration plutôt que d'être supposé.
--
-- Le choix unique est le défaut : c'est le cas de loin le plus fréquent, et
-- c'est celui qui ne peut pas produire de facture absurde.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE product_options
  ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'single';

-- La contrainte évite qu'une valeur mal saisie n'ouvre silencieusement le
-- cumul sur une option qui ne le supporte pas.
ALTER TABLE product_options DROP CONSTRAINT IF EXISTS product_options_selection_mode_check;
ALTER TABLE product_options
  ADD CONSTRAINT product_options_selection_mode_check
  CHECK (selection_mode IN ('single', 'multiple'));

COMMENT ON COLUMN product_options.selection_mode IS
  'single : la nouvelle valeur remplace la précédente. multiple : les valeurs s''additionnent, et leurs suppléments aussi.';

-- ── Blocs de description : ordre propre ───────────────────────────────────
-- Les blocs suivent l'ordre des valeurs, mais celui-ci sert aussi aux
-- sélecteurs. Un ordre distinct permet de présenter les explications dans un
-- autre enchaînement que les boutons, sans déplacer ces derniers.
ALTER TABLE product_option_values
  ADD COLUMN IF NOT EXISTS block_sort_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN product_option_values.block_sort_order IS
  'Ordre du bloc explicatif dans la section Description, indépendant de l''ordre du sélecteur.';

NOTIFY pgrst, 'reload schema';
