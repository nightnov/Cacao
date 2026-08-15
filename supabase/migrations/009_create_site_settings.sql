-- Table de réglages généraux du site (clé/valeur), ex: bannière promo de la page d'accueil
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write" ON site_settings
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO site_settings (key, value) VALUES ('homepage_banner_url', NULL)
ON CONFLICT (key) DO NOTHING;
