-- ═══════════════════════════════════════════════════════════════════════════
-- Thèmes de couleur du site (Nuit, Noël, Halloween…)
--
-- Objectif : permettre à l'administration de changer la teinte de la boutique
-- sans redéploiement, et de programmer un habillage saisonnier qui s'active et
-- se retire tout seul aux dates choisies.
--
-- Choix de conception important : la programmation n'est PAS exécutée par une
-- tâche planifiée. Le thème est résolu à chaque affichage de page en comparant
-- la date du jour aux bornes `starts_on` / `ends_on`. Conséquences :
--   - rien à surveiller, aucun cron ne peut « oublier » de tourner ;
--   - le retour au thème normal est automatique le lendemain de `ends_on` ;
--   - si la base est injoignable, le site retombe sur le thème « Nuit » écrit
--     en dur dans app/globals.css, jamais sur du noir sur noir.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_themes (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  -- Les 18 tokens de couleur, en hexadécimal (« #FDC700 »). L'hexadécimal est
  -- la forme que manipule l'administration ; la conversion en canaux R G B pour
  -- les variables CSS se fait à l'affichage.
  tokens JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Les thèmes fournis avec le site. Ils sont modifiables mais pas supprimables,
  -- pour qu'il reste toujours un habillage valide sur lequel retomber.
  is_builtin BOOLEAN NOT NULL DEFAULT false,

  -- Bornes de programmation, incluses toutes les deux. Les deux à NULL = thème
  -- non programmé, utilisable uniquement en le choisissant comme thème par défaut.
  starts_on DATE,
  ends_on DATE,

  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une borne seule n'a pas de sens et produirait une fenêtre ouverte qui ne se
  -- refermerait jamais : soit les deux dates, soit aucune.
  CONSTRAINT site_themes_dates_paired CHECK (
    (starts_on IS NULL AND ends_on IS NULL)
    OR (starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on)
  )
);

-- Recherche du thème programmé actif : index sur la borne de fin.
CREATE INDEX IF NOT EXISTS site_themes_schedule_idx
  ON site_themes (ends_on, starts_on)
  WHERE starts_on IS NOT NULL;

ALTER TABLE site_themes ENABLE ROW LEVEL SECURITY;

-- Lecture publique : les couleurs du site sont visibles par tout visiteur, il
-- n'y a rien de confidentiel dedans et la page d'accueil doit pouvoir les lire
-- sans être authentifiée.
DROP POLICY IF EXISTS "site_themes_public_read" ON site_themes;
CREATE POLICY "site_themes_public_read" ON site_themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_themes_admin_write" ON site_themes;
CREATE POLICY "site_themes_admin_write" ON site_themes
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- ───────────────────────────────────────────────────────────────────────────
-- Thèmes fournis
--
-- Chaque palette a été construite pour que le texte reste lisible sur son fond :
-- `ink` sur `bg` dépasse 12:1, `ink-dimmer` reste au-dessus du minimum WCAG AA
-- de 4.5:1, et l'accent est toujours assez clair pour recevoir `ink-invert`
-- (texte sombre) plutôt que du blanc, qui serait illisible dessus.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO site_themes (slug, name, tokens, is_builtin, sort_order) VALUES
('nuit', 'Nuit', '{
  "bg":"#222427","bg-panel":"#1C2021","bg-sunken":"#171A1C","bg-raised":"#2A2D31",
  "ink":"#EEF2F7","ink-dim":"#B3B8BE","ink-dimmer":"#8E959D","ink-faint":"#6F767E",
  "ink-invert":"#1A1A1A","border":"#35383C","border-mid":"#3E4247","border-strong":"#4E5257",
  "gold":"#FDC700","gold-dim":"#E0B000","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#3CA4FF","danger":"#F87171"
}'::jsonb, true, 1),

('noel', 'Noël', '{
  "bg":"#1B2422","bg-panel":"#16201E","bg-sunken":"#111A18","bg-raised":"#232E2B",
  "ink":"#F2F7F4","ink-dim":"#B6C2BD","ink-dimmer":"#8F9C97","ink-faint":"#6E7B76",
  "ink-invert":"#121A18","border":"#2E3A36","border-mid":"#374440","border-strong":"#47554F",
  "gold":"#E8B44A","gold-dim":"#C99A34","green":"#00A63E","green-bright":"#4FD68A",
  "info":"#5AB0F5","danger":"#F87171"
}'::jsonb, true, 2),

('halloween', 'Halloween', '{
  "bg":"#1E1A22","bg-panel":"#191521","bg-sunken":"#14111B","bg-raised":"#28222E",
  "ink":"#F4F0F7","ink-dim":"#BDB4C4","ink-dimmer":"#968CA0","ink-faint":"#756C7E",
  "ink-invert":"#17131C","border":"#38313F","border-mid":"#423A49","border-strong":"#524959",
  "gold":"#FF9A2E","gold-dim":"#DB7C15","green":"#3FCE7A","green-bright":"#5EE096",
  "info":"#A78BFA","danger":"#F87171"
}'::jsonb, true, 3),

('independance', 'Fête nationale', '{
  "bg":"#212327","bg-panel":"#1B1E21","bg-sunken":"#16191B","bg-raised":"#292C31",
  "ink":"#EFF3F7","ink-dim":"#B4B9BF","ink-dimmer":"#8F969E","ink-faint":"#6F767E",
  "ink-invert":"#1A1A1A","border":"#34373C","border-mid":"#3D4146","border-strong":"#4D5156",
  "gold":"#FF9A3C","gold-dim":"#E07E22","green":"#00A63E","green-bright":"#3FCE7A",
  "info":"#3CA4FF","danger":"#F87171"
}'::jsonb, true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Thème par défaut : celui qui s'applique hors de toute période programmée.
INSERT INTO site_settings (key, value) VALUES ('active_theme', 'nuit')
ON CONFLICT (key) DO NOTHING;
