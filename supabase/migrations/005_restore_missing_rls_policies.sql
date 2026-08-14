-- Audit complet via pg_policies le 2026-08-14 après la découverte du bug
-- products_public_read manquant (voir 004). L'audit a révélé que plusieurs
-- autres policies prévues dans 001_create_tables.sql n'existaient PAS non
-- plus sur la base live: shipping_fees_public_read, et TOUTES les policies
-- de profiles et order_items. Hypothèse: perdues lors d'une correction
-- manuelle antérieure de l'UUID admin (DROP POLICY sans CREATE POLICY
-- correspondant pour certaines).
--
-- Cette migration restaure l'intégralité du modèle de sécurité prévu à
-- l'origine, idempotente (safe à ré-exécuter).

-- shipping_fees: lecture publique manquante (même bug que products)
DROP POLICY IF EXISTS "shipping_fees_public_read" ON shipping_fees;
CREATE POLICY "shipping_fees_public_read" ON shipping_fees FOR SELECT USING (true);

-- profiles: aucune policy présente sur la base live
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_user_view_own" ON profiles;
CREATE POLICY "profiles_user_view_own" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_user_update_own" ON profiles;
CREATE POLICY "profiles_user_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_user_insert" ON profiles;
CREATE POLICY "profiles_user_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_view_all" ON profiles;
CREATE POLICY "profiles_admin_view_all" ON profiles FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- order_items: aucune policy présente sur la base live
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_user_view" ON order_items;
CREATE POLICY "order_items_user_view" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "order_items_user_insert" ON order_items;
CREATE POLICY "order_items_user_insert" ON order_items FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);
