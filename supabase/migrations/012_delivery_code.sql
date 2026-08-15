-- Code de confirmation de livraison: le client le donne au livreur
-- uniquement au moment de recevoir son colis (preuve de remise).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code TEXT;

-- Notes de commande optionnelles laissées par le client
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
