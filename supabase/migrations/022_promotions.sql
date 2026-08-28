-- ═══════════════════════════════════════════════════════════════════════════
-- Codes de réduction + colonnes de remise sur les commandes
--
-- Note importante sur la sécurité : un code promo n'est fiable que si la
-- réduction est recalculée par le serveur au moment du paiement. Le montant
-- envoyé au prestataire de paiement était jusqu'ici celui calculé par le
-- navigateur ; c'est corrigé dans app/api/payment/initiate/route.ts, qui
-- reconstruit le total à partir des prix en base. Cette table n'a de valeur
-- qu'avec ce recalcul.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Stocké en majuscules, comparé en majuscules : « rentree10 » et
  -- « RENTREE10 » doivent désigner le même code.
  code TEXT NOT NULL UNIQUE,
  description TEXT,

  kind TEXT NOT NULL CHECK (kind IN ('percent', 'amount', 'free_shipping')),

  -- Pourcentage (1-100) pour 'percent', montant en FCFA pour 'amount',
  -- ignoré pour 'free_shipping'.
  value INTEGER NOT NULL DEFAULT 0,

  min_order_fcfa INTEGER NOT NULL DEFAULT 0,

  starts_on DATE,
  ends_on DATE,

  -- NULL = pas de limite globale.
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  once_per_customer BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promotions_value_sane CHECK (
    (kind = 'percent' AND value BETWEEN 1 AND 100)
    OR (kind = 'amount' AND value > 0)
    OR kind = 'free_shipping'
  ),
  CONSTRAINT promotions_dates_ordered CHECK (
    starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on
  )
);

CREATE INDEX IF NOT EXISTS promotions_code_idx ON promotions (upper(code));

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Pas de lecture publique : la liste complète des codes n'a pas à être
-- téléchargeable par n'importe qui. La vérification d'un code se fait par la
-- route serveur /api/promotions/validate, qui ne répond que sur un code fourni.
DROP POLICY IF EXISTS "promotions_admin_all" ON promotions;
CREATE POLICY "promotions_admin_all" ON promotions
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Remise portée par la commande. `promo_code` est une copie du code au moment
-- de l'achat : si la promotion est supprimée plus tard, la commande garde la
-- trace de ce qui a été appliqué.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_fcfa INTEGER NOT NULL DEFAULT 0;

-- Une utilisation par commande, pour compter les usages sans double comptage
-- si le paiement est relancé.
CREATE TABLE IF NOT EXISTS promotion_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, order_id)
);

CREATE INDEX IF NOT EXISTS promotion_uses_customer_idx
  ON promotion_uses (promotion_id, user_id);

ALTER TABLE promotion_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion_uses_admin_read" ON promotion_uses;
CREATE POLICY "promotion_uses_admin_read" ON promotion_uses
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- ───────────────────────────────────────────────────────────────────────────
-- Comptabilisation de l'usage d'un code, à la confirmation du paiement
--
-- Même principe que pour le stock : c'est l'insertion dans `promotion_uses`
-- qui autorise l'incrément, et non l'inverse. La contrainte d'unicité
-- (promotion_id, order_id) fait que la deuxième notification pour la même
-- commande n'insère rien, et le compteur ne bouge pas deux fois.
--
-- Compter à la confirmation et non à la commande : un panier abandonné avant
-- paiement ne doit pas consommer une place sur un code limité.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_order_promotion(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_discount INTEGER;
  v_user UUID;
  v_promo_id UUID;
  v_use_id UUID;
BEGIN
  SELECT promo_code, discount_fcfa, user_id
    INTO v_code, v_discount, v_user
  FROM orders WHERE id = p_order_id;

  IF v_code IS NULL OR COALESCE(v_discount, 0) <= 0 THEN
    RETURN false;
  END IF;

  SELECT id INTO v_promo_id FROM promotions WHERE upper(code) = upper(v_code);
  IF v_promo_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO promotion_uses (promotion_id, order_id, user_id)
  VALUES (v_promo_id, p_order_id, v_user)
  ON CONFLICT (promotion_id, order_id) DO NOTHING
  RETURNING id INTO v_use_id;

  IF v_use_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE promotions SET used_count = used_count + 1 WHERE id = v_promo_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION apply_order_promotion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_order_promotion(UUID) TO service_role;
