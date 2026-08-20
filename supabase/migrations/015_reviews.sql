-- Avis clients
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_user_manage_own" ON reviews;
CREATE POLICY "reviews_user_manage_own" ON reviews
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Vue agrégée publique (évite le N+1 sur les grilles de cartes produits)
CREATE OR REPLACE VIEW product_ratings AS
  SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS review_count
  FROM reviews
  GROUP BY product_id;

GRANT SELECT ON product_ratings TO anon, authenticated;
