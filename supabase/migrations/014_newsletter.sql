-- Inscriptions newsletter (accueil)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_public_insert" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_admin_select" ON newsletter_subscribers;
CREATE POLICY "newsletter_admin_select" ON newsletter_subscribers
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');
