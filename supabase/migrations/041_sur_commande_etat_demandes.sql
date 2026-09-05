-- ═══════════════════════════════════════════════════════════════════════════
-- Commande sur mesure : le prix se confirme avant le paiement
--
-- Le site supposait jusqu'ici que tout produit affiché est disponible et
-- payable tout de suite. Ce n'est vrai que d'une partie du catalogue : une
-- machine peut partir entre la photo et la commande, et une configuration
-- particulière ne se chiffre qu'après vérification.
--
-- La colonne `availability` existait déjà avec la valeur 'on_order', mais
-- rien ne s'en servait : seul 'discontinued' bloquait l'achat. Un client
-- pouvait donc payer une machine absente. Comme aucun remboursement
-- automatique n'existe dans le projet — le statut « Remboursée » est une
-- étiquette posée à la main, elle ne déclenche rien chez MoneyFusion — la
-- seule protection solide est de ne pas encaisser tant que le prix n'est pas
-- ferme.
--
-- ── Pourquoi une commande et non une « demande » ─────────────────────────
--
-- Une table de demandes séparée avait été envisagée. Elle a été écartée :
-- elle aurait affiché « votre demande » au client, ce qui laisse entendre que
-- la marchandise n'est pas détenue et invite à chercher ailleurs. Elle aurait
-- aussi imposé un second écran à surveiller, et la réécriture de tout ce qui
-- existe déjà — numéro de commande, code de livraison, historique du compte.
--
-- Ce qui suit reste donc une commande ordinaire, simplement dans un état où
-- le montant n'est pas encore arrêté.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── État de l'appareil ────────────────────────────────────────────────────
-- Information attendue sur du matériel qui n'est pas systématiquement neuf.
-- Affichée discrètement dans les caractéristiques : la taire serait trompeur,
-- l'afficher en gros sur la carte ferait fuir avant lecture.
--
-- NULL est permis et signifie « non précisé » : mieux vaut ne rien dire que
-- forcer une valeur par défaut qui affirmerait à tort « neuf ».
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_condition TEXT
  CHECK (item_condition IN ('neuf_scelle', 'neuf_ouvert', 'quasi_neuf', 'reconditionne'));

COMMENT ON COLUMN products.item_condition IS
  'État de l''appareil. NULL = non précisé, aucune affirmation faite au client.';

-- ── Prix indicatif ────────────────────────────────────────────────────────
-- Sur une machine à commander, le montant définitif n'est connu qu'au
-- chiffrage. Annoncer un prix ferme engagerait sur une somme inconnue.
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_is_estimate BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.price_is_estimate IS
  'Vrai : le prix affiché est indicatif et sera confirmé avant tout paiement.';

-- ── Deux nouveaux états de commande ───────────────────────────────────────
-- 'awaiting_quote' : enregistrée, configuration connue, montant pas encore
--                    arrêté. Aucun paiement n'est proposé dans cet état.
-- 'quoted'         : montant confirmé, le client peut régler.
--
-- La contrainte est reconstruite plutôt qu'ajoutée : une contrainte CHECK ne
-- s'étend pas, elle se remplace. Les sept statuts existants sont repris à
-- l'identique — en omettre un rendrait invalides des commandes déjà passées.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'awaiting_quote', 'quoted',
  'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'
));

-- Marque la commande comme étant à chiffrer. Une colonne dédiée plutôt qu'une
-- déduction depuis le statut : la commande garde cette nature après le
-- paiement, et c'est ce qui permet de la retrouver plus tard.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_custom_order BOOLEAN NOT NULL DEFAULT FALSE;

-- Montant indicatif affiché au client au moment où il a validé. Conservé pour
-- savoir sur quelle base il s'est décidé, quand le prix confirmé s'en écarte.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_total_fcfa INTEGER;

-- Note interne : ce que vous notez en préparant le chiffrage. Jamais montré
-- au client.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_note TEXT;

-- Ce que le client a écrit en validant sa configuration, quand il a précisé
-- une exigence que les sélecteurs ne couvrent pas.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_request TEXT;

-- Les commandes à chiffrer se consultent en premier : ce sont les seules qui
-- attendent une action de votre part avant que le client puisse avancer.
CREATE INDEX IF NOT EXISTS orders_awaiting_quote_idx
  ON orders (created_at DESC) WHERE status = 'awaiting_quote';

-- Une commande à chiffrer part à zéro : total_fcfa est NOT NULL et le montant
-- réel n'existe pas encore. La valeur par défaut évite d'avoir à l'écrire à
-- chaque insertion.
ALTER TABLE orders ALTER COLUMN total_products_fcfa SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN shipping_cost_fcfa SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN total_fcfa SET DEFAULT 0;

NOTIFY pgrst, 'reload schema';
