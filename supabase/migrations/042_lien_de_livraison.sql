-- ═══════════════════════════════════════════════════════════════════════════
-- Confirmation de livraison par le livreur, sans lui ouvrir la base
--
-- Le code de livraison existait déjà : il est fabriqué à la commande, montré
-- au client, montré à l'administration. Mais le livreur — seul à devoir le
-- vérifier — n'avait aucun moyen de le faire. Le code ne servait donc à rien.
--
-- ── Pourquoi un lien par colis et non une page unique ────────────────────
--
-- Une page publique où l'on saisit n'importe quel code avait été envisagée.
-- Elle est écartée pour une raison mesurable : le code fait quatre chiffres,
-- soit neuf mille possibilités (voir generateDeliveryCode dans le tunnel de
-- commande). Une telle page, qui affiche le nom, le téléphone et l'adresse du
-- destinataire, permettrait de tous les extraire en quelques minutes par
-- essais successifs, et de marquer les commandes livrées à tort.
--
-- Le jeton ci dessous est au contraire long et imprévisible, et ne vaut que
-- pour une commande. Le livreur reçoit le lien de SON colis. Aucune page ne
-- permet d'interroger l'ensemble des codes.
--
-- Le code à quatre chiffres reste volontairement court : il est dicté à voix
-- haute par le client au livreur, et il n'est essayable que par celui qui
-- détient déjà le lien du colis — dans la limite du compteur ci dessous.
-- ═══════════════════════════════════════════════════════════════════════════

-- Deux UUID concaténés : 64 caractères hexadécimaux, sans dépendre de
-- l'extension pgcrypto, qui n'est pas garantie présente.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_token TEXT
  DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

-- Les commandes déjà en base n'en avaient pas.
UPDATE orders SET delivery_token =
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE delivery_token IS NULL;

-- Deux colis ne doivent jamais partager un lien.
CREATE UNIQUE INDEX IF NOT EXISTS orders_delivery_token_idx ON orders (delivery_token);

-- Horodatage de la remise. C'est lui la preuve : il n'est écrit que si le code
-- saisi correspond, donc que si le livreur a rencontré le client.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Essais infructueux. Au delà de cinq, le lien cesse d'accepter des codes :
-- sans ce frein, les neuf mille combinaisons restent essayables une à une par
-- quiconque détient le lien. La confirmation se fait alors depuis
-- l'administration.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.delivery_token IS
  'Identifiant du lien remis au livreur pour ce colis. À ne jamais afficher au client.';

NOTIFY pgrst, 'reload schema';
