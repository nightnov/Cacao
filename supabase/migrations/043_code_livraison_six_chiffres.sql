-- ═══════════════════════════════════════════════════════════════════════════
-- Un lien de confirmation unique, et un code assez long pour le permettre
--
-- La migration précédente donnait un lien par colis. C'était sûr, mais lourd à
-- l'usage : il fallait retrouver et transmettre un lien différent à chaque
-- livraison. Le livreur veut enregistrer une adresse une fois pour toutes.
--
-- Un lien fixe est possible, à une condition. Avec une page connue de tous,
-- c'est le code seul qui protège — et quatre chiffres ne suffisent pas : neuf
-- mille combinaisons s'essaient une à une en quelques minutes, ce qui
-- permettrait de marquer livrées des commandes qui ne le sont pas.
--
-- Six chiffres portent le total à un million. Avec la limite d'essais ci
-- dessous, il faudrait des années pour en trouver un au hasard. Et rien n'est
-- affiché tant que le code n'est pas juste : un essai raté n'apprend même pas
-- si une commande existe.
--
-- Dicter six chiffres n'est pas plus difficile que quatre : c'est la longueur
-- des codes de confirmation bancaires que tout le monde utilise déjà.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Preuve de remise ──────────────────────────────────────────────────────
-- Écrit uniquement quand le code saisi correspond, donc uniquement si le
-- livreur a rencontré le client. C'est cet horodatage qui fait foi en cas de
-- contestation, pas le statut, qui se change à la main.
--
-- Repris de la migration 042 pour que celle ci soit exécutable seule : la 042
-- posait un lien par colis, abandonné au profit d'une page unique.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- ── Essais, pour freiner la recherche au hasard ───────────────────────────
-- Les codes ne sont plus rattachés à un colis précis via un lien : la limite
-- ne peut donc plus être comptée par commande. Elle l'est par appareil.
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  -- Empreinte de l'adresse réseau, pas l'adresse elle même : elle suffit à
  -- compter les essais sans conserver de donnée identifiante.
  ip_hash TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_attempts_recent_idx
  ON delivery_attempts (ip_hash, created_at DESC);

-- Écrite et lue uniquement par le serveur, avec la clé de service. Aucune
-- politique n'est ouverte : le navigateur n'a rien à y faire.
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;

-- ── Codes existants ───────────────────────────────────────────────────────
-- Les commandes déjà passées gardent leur code à quatre chiffres : le client
-- l'a peut être noté, le changer sous ses yeux le rendrait faux. Les nouvelles
-- commandes reçoivent six chiffres (voir generateDeliveryCode dans le tunnel
-- de commande). La vérification accepte donc les deux longueurs.

NOTIFY pgrst, 'reload schema';
