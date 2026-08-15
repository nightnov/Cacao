-- Messagerie client <-> boutique: un fil de discussion par client.
-- Un client peut écrire depuis son compte ou depuis une fiche produit
-- (auquel cas product_id/product_name donnent le contexte de ce message
-- précis). L'admin voit tous les fils et répond, la réponse apparaît dans
-- le même fil côté client.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  sender TEXT CHECK (sender IN ('customer', 'admin')) NOT NULL,
  body TEXT NOT NULL,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_by_customer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_user_view_own" ON messages;
CREATE POLICY "messages_user_view_own" ON messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_user_insert" ON messages;
CREATE POLICY "messages_user_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id AND sender = 'customer');

DROP POLICY IF EXISTS "messages_user_update_own" ON messages;
CREATE POLICY "messages_user_update_own" ON messages FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_admin_view_all" ON messages;
CREATE POLICY "messages_admin_view_all" ON messages FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "messages_admin_insert" ON messages;
CREATE POLICY "messages_admin_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff' AND sender = 'admin');

DROP POLICY IF EXISTS "messages_admin_update" ON messages;
CREATE POLICY "messages_admin_update" ON messages FOR UPDATE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');
