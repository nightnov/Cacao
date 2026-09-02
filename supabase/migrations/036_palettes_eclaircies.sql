-- ═══════════════════════════════════════════════════════════════════════════
-- Fonds éclaircis : le site paraissait éteint
--
-- Le fond était descendu à #17191C et les cartes à #212429, là où le site de
-- référence tient #222427 pour la page et #333638 pour les cartes. L'écart se
-- voyait immédiatement en comparant les deux : un anthracite trop noir avale
-- les photos de machines au lieu de les porter, et les bordures sombres
-- dessinaient des traits noirs au lieu de séparer deux surfaces.
--
-- Tous les fonds et tous les traits remontent d'un cran. Les textes suivent
-- pour rester lisibles sur des surfaces plus claires, et l'accent Gaming est
-- éclairci parce qu'il tombait à 4.01:1 sur les nouvelles cartes.
--
-- Contrastes vérifiés sur les quatre palettes : texte discret au-dessus de
-- 4.5:1 sur les cartes, couleur de prix au-dessus de 4.5:1, texte posé sur un
-- aplat d'accent au-dessus de 5:1. L'ordre creusé < fond < carte < surélevé
-- est conservé partout.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#222427","bg-panel":"#313437","bg-sunken":"#1D2022","bg-raised":"#35383B",
  "ink":"#EEF2F7","ink-dim":"#B3B8BE","ink-dimmer":"#9AA1A8","ink-faint":"#7C838A",
  "border":"#45484C","border-mid":"#52565A","border-strong":"#616569",
  "cat-gaming":"#B189FF","danger":"#FA8C8C"
}'::jsonb WHERE slug = 'cacao-premium';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#232128","bg-panel":"#322F3A","bg-sunken":"#1E1C23","bg-raised":"#36333E",
  "ink":"#EFEDF4","ink-dim":"#BCB8CA","ink-dimmer":"#A09BAB","ink-faint":"#827D8E",
  "border":"#4A4655","border-mid":"#565162","border-strong":"#655F73",
  "accent":"#B189FF","accent-dim":"#9866F0","action":"#B189FF",
  "cat-gaming":"#C9AEFF","danger":"#FA8C8C"
}'::jsonb WHERE slug = 'palette-gaming';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#26231F","bg-panel":"#37332E","bg-sunken":"#201E1A","bg-raised":"#3B3731",
  "ink":"#F2EFEB","ink-dim":"#C6BCB0","ink-dimmer":"#ABA294","ink-faint":"#8B8274",
  "border":"#4C463E","border-mid":"#585148","border-strong":"#675F54",
  "cat-gaming":"#B189FF","danger":"#FA8C8C"
}'::jsonb WHERE slug = 'palette-bureau';

UPDATE site_themes SET tokens = tokens || '{
  "bg":"#1F2624","bg-panel":"#2E3634","bg-sunken":"#1A211F","bg-raised":"#323A38",
  "ink":"#EBF2F0","ink-dim":"#AFC2BD","ink-dimmer":"#97ABA5","ink-faint":"#798D87",
  "border":"#414D4A","border-mid":"#4C5956","border-strong":"#5B6A66",
  "cat-gaming":"#B189FF","danger":"#FA8C8C"
}'::jsonb WHERE slug = 'palette-accessoires';

-- L'ancienne palette « Nuit » reste disponible, mais elle aussi remonte : elle
-- servait de repli et aurait rendu le site sombre à la moindre bascule.
UPDATE site_themes SET tokens = tokens || '{
  "bg":"#222427","bg-panel":"#313437","bg-sunken":"#1D2022","bg-raised":"#35383B",
  "border":"#45484C","border-mid":"#52565A","border-strong":"#616569"
}'::jsonb WHERE slug = 'nuit';

NOTIFY pgrst, 'reload schema';
