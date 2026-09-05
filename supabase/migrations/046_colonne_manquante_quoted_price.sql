-- ═══════════════════════════════════════════════════════════════════════════
-- La colonne qui manquait : orders.quoted_price_fcfa
--
-- Le tableau de bord n'affichait aucune commande alors que la base en
-- contenait huit, parfaitement lisibles par le compte administrateur. La
-- cause n'était ni le paiement ni les droits : la liste demande, entre autres
-- colonnes, le montant confirmé d'une commande sur mesure. Cette colonne
-- n'existait pas. Or une base ne répond pas partiellement à une requête — elle
-- la rejette en entier. Sept colonnes valides et une absente donnent donc zéro
-- ligne, et l'écran affiche « aucune commande » avec l'aplomb d'une base vide.
--
-- La migration 041 déclarait pourtant cette colonne. Ses autres ajouts sont
-- bien présents : elle s'est interrompue en cours de route. C'est le risque
-- d'un fichier exécuté à la main, et la raison pour laquelle tout est écrit
-- ici en IF NOT EXISTS : réappliquer ce fichier sur une base déjà correcte ne
-- fait rien, et ne casse rien.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_price_fcfa INTEGER;

-- Le reste de 041, redonné par précaution : si l'exécution s'est arrêtée sur
-- une colonne, rien ne garantit que les suivantes soient passées.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_custom_order BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_total_fcfa INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_request TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Les deux états des commandes sur mesure. Sans eux, confirmer un montant
-- échouerait sur la contrainte au moment même où l'on croit avoir répondu au
-- client.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'awaiting_quote','quoted','pending','confirmed','preparing','shipped',
  'delivered','cancelled','refunded'));

-- Sans ce rappel, la couche d'accès garde en mémoire l'ancienne description
-- des tables et continue de répondre que la colonne n'existe pas.
NOTIFY pgrst, 'reload schema';
