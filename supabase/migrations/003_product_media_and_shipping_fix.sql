-- Fix: shipping_fees.fee_fcfa était mal nommé (incohérent avec products.price_fcfa).
-- Toute l'interface admin (Étape 15) interroge déjà "price_fcfa" -> /admin/shipping
-- était cassé en production (erreur Postgres 42703 confirmée en direct).
ALTER TABLE shipping_fees RENAME COLUMN fee_fcfa TO price_fcfa;

-- Ajout du lien vidéo produit (YouTube/Vimeo) pour la fiche produit détaillée
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Bucket de stockage pour les photos produit (upload direct depuis l'admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique des images, écriture réservée à l'admin
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Filet de sécurité: réaffirme l'UUID admin courant sur les tables déjà en
-- production, au cas où la mise à jour manuelle faite lors de l'Étape 12
-- n'aurait pas couvert toutes les policies (le décalage trouvé sur
-- shipping_fees ci-dessus montre que le fichier de migration et la base
-- réelle peuvent diverger).
DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products FOR INSERT WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products FOR UPDATE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products FOR DELETE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "payment_logs_admin_all" ON payment_logs;
CREATE POLICY "payment_logs_admin_all" ON payment_logs FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "shipping_fees_admin_write" ON shipping_fees;
CREATE POLICY "shipping_fees_admin_write" ON shipping_fees FOR INSERT WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "shipping_fees_admin_update" ON shipping_fees;
CREATE POLICY "shipping_fees_admin_update" ON shipping_fees FOR UPDATE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Manquait dans la migration initiale: suppression de tarif de livraison
DROP POLICY IF EXISTS "shipping_fees_admin_delete" ON shipping_fees;
CREATE POLICY "shipping_fees_admin_delete" ON shipping_fees FOR DELETE USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');
