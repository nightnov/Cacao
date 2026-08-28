-- ═══════════════════════════════════════════════════════════════════════════
-- Rayons en base
--
-- Jusqu'ici les rayons étaient une liste écrite dans lib/categories.ts : en
-- ajouter un, le renommer ou changer son ordre demandait une modification du
-- code et un redéploiement. Ils passent en base pour être gérés depuis
-- l'administration.
--
-- `value` reste la clé, parce que c'est elle qui est déjà stockée dans
-- products.category et qui apparaît dans les adresses (/products?category=…).
-- La renommer casserait les liens existants et le référencement, donc elle
-- n'est pas modifiable une fois créée.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,

  -- Nom d'icône, pas de composant : la base ne peut pas stocker de code. La
  -- correspondance nom → icône vit dans lib/categories.ts, et un nom inconnu
  -- retombe sur une icône neutre plutôt que de faire planter la page.
  icon TEXT NOT NULL DEFAULT 'Package',

  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,

  -- Masquer un rayon le retire des menus sans toucher aux produits qu'il
  -- contient : ils restent accessibles par la recherche et par leur lien direct.
  is_visible BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_order_idx ON categories (sort_order, value);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write" ON categories
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Reprise à l'identique de la liste qui était dans le code, ordre compris.
-- Chaque rayon garde une icône distincte : « PC Bureau » et « Écrans »
-- partageaient la même, ce qui les rendait impossibles à différencier.
INSERT INTO categories (value, label, short_label, icon, sort_order) VALUES
  ('portable',    'PC Portables', 'Portables',   'Laptop',     1),
  ('bureau',      'PC Bureau',    'Bureau',      'PcCase',     2),
  ('gaming',      'Gaming',       'Gaming',      'Gamepad2',   3),
  ('ecrans',      'Écrans',       'Écrans',      'Monitor',    4),
  ('accessoire',  'Accessoires',  'Accessoires', 'Headphones', 5),
  ('composants',  'Composants',   'Composants',  'Cpu',        6),
  ('stockage',    'Stockage',     'Stockage',    'HardDrive',  7),
  ('imprimantes', 'Imprimantes',  'Imprimantes', 'Printer',    8)
ON CONFLICT (value) DO NOTHING;
