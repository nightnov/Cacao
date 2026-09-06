-- ═══════════════════════════════════════════════════════════════════════════
-- Fermer les écritures publiques sans borne
--
-- Trois tables acceptaient les écritures de n'importe quel visiteur : le
-- journal des recherches, le compteur de vues et les inscriptions à la lettre
-- d'information. C'était nécessaire pour qu'elles fonctionnent sans compte,
-- mais rien ne bornait le volume : la clé publique du site est lisible dans le
-- navigateur, et un script pouvait s'en servir pour verser des millions de
-- lignes. Le quota de la base, que vous payez, y serait passé, et les
-- statistiques avec.
--
-- Ces écritures passent désormais par le serveur, qui compte les appels par
-- appareil avant d'accepter. Les règles d'insertion publiques n'ont donc plus
-- de raison d'être : le serveur écrit avec la clé de service, qui ignore ces
-- règles.
--
-- La lecture n'est pas touchée. Rien ne change pour un visiteur ordinaire.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_events (
  id BIGSERIAL PRIMARY KEY,
  -- Le nom de l'usage compté : « recherche », « vue », « lettre ». Un même
  -- appareil peut ainsi atteindre la limite d'un usage sans être privé des
  -- autres.
  bucket TEXT NOT NULL,
  -- Empreinte de l'adresse, jamais l'adresse elle même.
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_events_lookup_idx
  ON rate_events (bucket, ip_hash, created_at DESC);

-- Aucune règle ouverte : seule la clé de service, côté serveur, y accède.
ALTER TABLE rate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_logs_public_insert" ON search_logs;
DROP POLICY IF EXISTS "search_logs_insert" ON search_logs;
DROP POLICY IF EXISTS "product_views_public_insert" ON product_views;
DROP POLICY IF EXISTS "product_views_insert" ON product_views;
DROP POLICY IF EXISTS "newsletter_public_insert" ON newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_insert" ON newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_insert" ON newsletter_subscribers;

NOTIFY pgrst, 'reload schema';
