-- ═══════════════════════════════════════════════════════════════════════════
-- Ranger une commande sans l'effacer
--
-- La liste se charge d'essais et de commandes closes, et l'essentiel finit
-- noyé. La tentation est alors de supprimer, mais une commande payée n'est pas
-- un brouillon : c'est la trace d'un encaissement réel, la seule preuve de ce
-- qui a été vendu et à qui. Supprimer une ligne dont l'argent est arrivé sur
-- le compte, c'est effacer la comptabilité pour gagner de la place à l'écran.
--
-- On range donc au lieu de détruire. Une commande archivée quitte la liste
-- courante et reste consultable d'un clic. Le geste est immédiat, et il est
-- réversible — ce qu'une suppression n'est jamais.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- La liste courante ne demande que les commandes non archivées. Sans cet
-- index, ce filtre parcourrait la table entière à chaque ouverture de l'écran.
CREATE INDEX IF NOT EXISTS orders_actives_idx
  ON orders (created_at DESC) WHERE archived_at IS NULL;

NOTIFY pgrst, 'reload schema';
