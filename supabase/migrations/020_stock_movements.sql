-- ═══════════════════════════════════════════════════════════════════════════
-- Décrément du stock à la confirmation de paiement
--
-- Problème corrigé : jusqu'ici le stock d'une variante n'était jamais déduit.
-- La fiche produit refuse bien d'ajouter au panier une variante à zéro, mais
-- comme le nombre ne bougeait jamais après une vente, il ne descendait à zéro
-- que si l'administrateur le saisissait à la main. La même dernière unité
-- pouvait donc être vendue plusieurs fois.
-- ═══════════════════════════════════════════════════════════════════════════

-- Journal des mouvements. Sert à deux choses : comprendre pourquoi un stock a
-- bougé, et garantir qu'une même commande ne soit jamais déduite deux fois
-- (MoneyFusion peut renvoyer plusieurs fois le même événement).
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Négatif pour une vente, positif pour un réapprovisionnement.
  delta INTEGER NOT NULL,
  stock_after INTEGER,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'manual', 'cancellation')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_variant_idx ON stock_movements (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_recent_idx ON stock_movements (created_at DESC);

-- Le garde-fou d'idempotence : au plus une déduction de vente par commande et
-- par variante. Une deuxième notification pour la même commande viole cette
-- contrainte, l'insertion est ignorée, le stock ne bouge pas une seconde fois.
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_sale_once_idx
  ON stock_movements (order_id, variant_id)
  WHERE reason = 'sale';

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Lecture réservée à l'administrateur : ces mouvements laissent deviner le
-- volume d'affaires, ça n'a pas à être public.
DROP POLICY IF EXISTS "stock_movements_admin_read" ON stock_movements;
CREATE POLICY "stock_movements_admin_read" ON stock_movements
  FOR SELECT USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

DROP POLICY IF EXISTS "stock_movements_admin_write" ON stock_movements;
CREATE POLICY "stock_movements_admin_write" ON stock_movements
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- ───────────────────────────────────────────────────────────────────────────
-- Déduction du stock pour une commande payée
--
-- SECURITY DEFINER : appelée depuis le webhook de paiement, qui n'est pas une
-- session authentifiée. La fonction ne prend qu'un identifiant de commande et
-- n'expose rien en retour à part un décompte, donc la surface est minime.
--
-- `FOR UPDATE` verrouille chaque ligne de variante le temps de la transaction.
-- Sans ce verrou, deux notifications arrivant en même temps liraient le même
-- stock de départ et écraseraient mutuellement leur soustraction.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_order_stock(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  v_stock INTEGER;
  v_movement_id UUID;
  v_applied INTEGER := 0;
BEGIN
  FOR item IN
    SELECT oi.variant_id, oi.product_id, SUM(oi.quantity)::INTEGER AS qty
    FROM order_items oi
    WHERE oi.order_id = p_order_id AND oi.variant_id IS NOT NULL
    GROUP BY oi.variant_id, oi.product_id
  LOOP
    -- Le mouvement est inscrit AVANT la soustraction, et c'est lui qui décide
    -- si elle a lieu. L'index unique fait office de verrou : si cette commande
    -- a déjà été déduite pour cette variante, rien n'est inséré, `v_movement_id`
    -- reste vide et on passe à la suivante sans toucher au stock.
    --
    -- Dans l'autre sens (soustraire puis journaliser), une notification répétée
    -- aurait décrémenté une deuxième fois avant de découvrir le doublon.
    INSERT INTO stock_movements (variant_id, product_id, order_id, delta, reason)
    VALUES (item.variant_id, item.product_id, p_order_id, -item.qty, 'sale')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_movement_id;

    CONTINUE WHEN v_movement_id IS NULL;

    SELECT stock INTO v_stock
    FROM product_variants
    WHERE id = item.variant_id
    FOR UPDATE;

    CONTINUE WHEN v_stock IS NULL;

    -- On autorise le stock à descendre à zéro mais pas en dessous. Un négatif
    -- ne représenterait rien de réel et ferait mentir les alertes.
    UPDATE product_variants
    SET stock = GREATEST(0, v_stock - item.qty), updated_at = now()
    WHERE id = item.variant_id;

    UPDATE stock_movements
    SET stock_after = GREATEST(0, v_stock - item.qty)
    WHERE id = v_movement_id;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION apply_order_stock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_order_stock(UUID) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Disponibilité du produit recalculée dès qu'un stock de variante bouge
--
-- `products.availability` pilote le badge du catalogue et de la fiche produit.
-- Il était jusqu'ici calculé une seule fois, au moment où l'administrateur
-- enregistrait le produit. Maintenant que les ventes déduisent le stock, ce
-- calcul isolé ne suffit plus : un produit dont toutes les variantes tombent à
-- zéro continuerait d'afficher « En stock » au catalogue.
--
-- Un déclencheur plutôt qu'un appel dans la fonction de vente : il couvre aussi
-- les corrections manuelles depuis l'administration et l'enregistrement du
-- formulaire produit, sans avoir à y penser à chaque fois.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_product_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID := COALESCE(NEW.product_id, OLD.product_id);
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(stock), 0) INTO v_total
  FROM product_variants
  WHERE product_id = v_product_id;

  -- Un produit sans aucune variante n'est pas concerné : sa disponibilité est
  -- saisie à la main et on n'a pas à l'écraser.
  IF EXISTS (SELECT 1 FROM product_variants WHERE product_id = v_product_id) THEN
    UPDATE products
    SET availability = CASE WHEN v_total > 0 THEN 'in_stock' ELSE 'discontinued' END
    WHERE id = v_product_id
      AND availability IS DISTINCT FROM
          CASE WHEN v_total > 0 THEN 'in_stock' ELSE 'discontinued' END;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS product_variants_sync_availability ON product_variants;
CREATE TRIGGER product_variants_sync_availability
  AFTER INSERT OR UPDATE OF stock OR DELETE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_availability();

-- Remise à niveau des produits existants, dont la disponibilité peut déjà être
-- fausse si des variantes ont été mises à zéro sans réenregistrer le produit.
UPDATE products p
SET availability = CASE WHEN v.total > 0 THEN 'in_stock' ELSE 'discontinued' END
FROM (
  SELECT product_id, COALESCE(SUM(stock), 0) AS total
  FROM product_variants
  GROUP BY product_id
) v
WHERE p.id = v.product_id
  AND p.availability IS DISTINCT FROM
      CASE WHEN v.total > 0 THEN 'in_stock' ELSE 'discontinued' END;

-- Seuil à partir duquel une variante est signalée « stock faible ».
INSERT INTO site_settings (key, value) VALUES ('low_stock_threshold', '2')
ON CONFLICT (key) DO NOTHING;
