-- Même bug que 004/005: les policies client sur orders (définies dans
-- 001_create_tables.sql) n'existaient pas sur la base live, seule
-- orders_admin_all était présente. Un client authentifié ne pouvait donc
-- ni voir ni créer ses propres commandes ('new row violates row-level
-- security policy for table "orders"' confirmé en testant le checkout).
DROP POLICY IF EXISTS "orders_user_view_own" ON orders;
CREATE POLICY "orders_user_view_own" ON orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_user_insert" ON orders;
CREATE POLICY "orders_user_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
