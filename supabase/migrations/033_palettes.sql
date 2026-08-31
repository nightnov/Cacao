-- ═══════════════════════════════════════════════════════════════════════════
-- Palettes de couleur : base sombre neutre, accents vifs et rares
--
-- Le site n'avait qu'une seule couleur d'accent, le doré, qui servait à la
-- fois de couleur de prix, de bouton, de lien et de promotion. À force de tout
-- porter, elle ne signalait plus rien.
--
-- La couleur suit désormais une hiérarchie, et chaque rôle a son jeton :
--   accent / accent-dim  prix réels et liens importants ;
--   action               bouton portant l'action principale d'un écran ;
--   cat-*                un détail par rayon (bouton de gamme, survol, trait) ;
--   gold                 promotions exceptionnelles, et rien d'autre.
--
-- Les contrastes ont été calculés sur chaque palette : la couleur de prix
-- dépasse 4.5:1 sur le fond des cartes, et le texte posé SUR un aplat d'accent
-- reste au-dessus de 5:1.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Compléter les palettes existantes ──────────────────────────────────
-- Sans cela, un thème enregistré avant cette migration n'aurait aucune valeur
-- pour les nouveaux jetons : les prix et les boutons perdraient leur couleur.
-- `||` n'écrase que les clés fournies, les couleurs déjà réglées sont gardées.
UPDATE site_themes SET tokens = tokens || '{
  "accent":"#36A8FF","accent-dim":"#1F87E8","action":"#36A8FF",
  "cat-portable":"#38D6F0","cat-bureau":"#E8994A",
  "cat-gaming":"#A472FF","cat-accessoire":"#3FD9A4"
}'::jsonb
WHERE NOT (tokens ? 'accent');

-- ── 2. Palettes prêtes à l'emploi ─────────────────────────────────────────
-- Toutes gardent une base anthracite : ce sont les accents qui changent, pas
-- la lisibilité. Les cartes restent plus claires que le fond dans chacune.

INSERT INTO site_themes (slug, name, tokens, is_builtin, sort_order) VALUES

('cacao-premium', 'CACAO Premium', '{
  "bg":"#17191C","bg-panel":"#212429","bg-sunken":"#121417","bg-raised":"#2A2E35",
  "ink":"#EDEFF2","ink-dim":"#B6BDC9","ink-dimmer":"#949CAA","ink-faint":"#737B88",
  "ink-invert":"#0E1013","border":"#2B3037","border-mid":"#363C45","border-strong":"#454C58",
  "accent":"#36A8FF","accent-dim":"#1F87E8","action":"#36A8FF",
  "cat-portable":"#38D6F0","cat-bureau":"#E8994A","cat-gaming":"#A472FF","cat-accessoire":"#3FD9A4",
  "gold":"#FDC700","gold-dim":"#E0B000","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#36A8FF","danger":"#F87171"
}'::jsonb, true, 0),

-- Anthracite légèrement violacé. L'accent gaming devient la couleur de prix ;
-- il reste à 4.99:1 sur les cartes, au-dessus du minimum.
('palette-gaming', 'Gaming', '{
  "bg":"#16151C","bg-panel":"#201F29","bg-sunken":"#111017","bg-raised":"#2A2835",
  "ink":"#EFEDF4","ink-dim":"#BCB8CA","ink-dimmer":"#9A97AC","ink-faint":"#78758A",
  "ink-invert":"#0D0C12","border":"#2E2C3A","border-mid":"#393648","border-strong":"#4A4760",
  "accent":"#A472FF","accent-dim":"#8B54F0","action":"#A472FF",
  "cat-portable":"#38D6F0","cat-bureau":"#E8994A","cat-gaming":"#C79BFF","cat-accessoire":"#3FD9A4",
  "gold":"#FDC700","gold-dim":"#E0B000","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#36A8FF","danger":"#F87171"
}'::jsonb, true, 10),

-- Anthracite tiède, accent cuivré. Le bleu reste disponible sur les rayons.
('palette-bureau', 'Bureau', '{
  "bg":"#1A1815","bg-panel":"#252220","bg-sunken":"#141210","bg-raised":"#2F2B28",
  "ink":"#F2EFEB","ink-dim":"#C6BCB0","ink-dimmer":"#A89E92","ink-faint":"#867D73",
  "ink-invert":"#120F0C","border":"#332F2B","border-mid":"#3F3A35","border-strong":"#524B44",
  "accent":"#E8994A","accent-dim":"#CC7C2E","action":"#E8994A",
  "cat-portable":"#38D6F0","cat-bureau":"#F0B173","cat-gaming":"#A472FF","cat-accessoire":"#3FD9A4",
  "gold":"#FDC700","gold-dim":"#E0B000","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#36A8FF","danger":"#F87171"
}'::jsonb, true, 11),

-- Anthracite verdi, accent turquoise.
('palette-accessoires', 'Accessoires', '{
  "bg":"#141A19","bg-panel":"#1E2624","bg-sunken":"#0F1514","bg-raised":"#27302E",
  "ink":"#EBF2F0","ink-dim":"#AFC2BD","ink-dimmer":"#93A8A2","ink-faint":"#748782",
  "ink-invert":"#0B100F","border":"#2A3532","border-mid":"#34403D","border-strong":"#44534F",
  "accent":"#3FD9A4","accent-dim":"#25B586","action":"#3FD9A4",
  "cat-portable":"#38D6F0","cat-bureau":"#E8994A","cat-gaming":"#A472FF","cat-accessoire":"#7BE8C4",
  "gold":"#FDC700","gold-dim":"#E0B000","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#36A8FF","danger":"#F87171"
}'::jsonb, true, 12)

ON CONFLICT (slug) DO UPDATE SET
  tokens = EXCLUDED.tokens,
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- ── 3. Palette active ─────────────────────────────────────────────────────
-- CACAO Premium devient la palette par défaut. On ne l'impose que si le site
-- était encore sur « Nuit », l'ancienne palette : un choix fait volontairement
-- depuis l'administration ne doit pas être écrasé par une migration.
UPDATE site_settings
SET value = 'cacao-premium'
WHERE key = 'active_theme'
  AND (value IS NULL OR value = 'nuit');

INSERT INTO site_settings (key, value) VALUES ('active_theme', 'cacao-premium')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
