-- Suivi de l'état des liens d'approvisionnement.
--
-- Un lien d'annonce meurt : le vendeur retire son offre, la plateforme range
-- la page. Le produit, lui, reste affiché « en stock » sur la boutique, et un
-- client peut le commander alors que plus personne ne peut le fournir.
--
-- Ces colonnes gardent la mémoire des essais successifs. Elles existent parce
-- qu'un seul échec ne veut rien dire : mesuré sur CoinAfrique, une annonce
-- parfaitement vivante a renvoyé une erreur serveur quatre fois sur cinq.
-- Basculer un produit sur un incident passager le sortirait de la vente sans
-- raison. Il faut donc compter, et ne compter que ce qui signifie vraiment
-- que l'annonce n'existe plus.

ALTER TABLE product_sourcing
  -- Date du dernier essai, quelle qu'en soit l'issue.
  ADD COLUMN IF NOT EXISTS verifie_le TIMESTAMPTZ,

  -- Code renvoyé au dernier essai. 0 quand le serveur n'a pas répondu du tout.
  ADD COLUMN IF NOT EXISTS dernier_statut INTEGER,

  -- Nombre de fois d'affilée où la page a répondu « cette adresse n'existe
  -- pas ». Remis à zéro dès qu'elle répond de nouveau. Une panne du site ou
  -- une lenteur ne l'incrémente jamais : ce sont des pannes du serveur, pas
  -- des annonces retirées.
  ADD COLUMN IF NOT EXISTS echecs_consecutifs INTEGER NOT NULL DEFAULT 0,

  -- Date à partir de laquelle l'annonce est tenue pour retirée.
  ADD COLUMN IF NOT EXISTS annonce_retiree_le TIMESTAMPTZ,

  -- Date à laquelle le produit a été basculé en « sur commande ».
  --
  -- Sert de garde fou : sans elle, si vous remettiez le produit en stock après
  -- avoir trouvé une autre source, la vérification du lendemain le rebasculerait
  -- aussitôt. Le système n'agit qu'une fois par lien mort, jamais en boucle
  -- contre une décision que vous venez de prendre.
  ADD COLUMN IF NOT EXISTS bascule_le TIMESTAMPTZ;

-- Aucune politique de lecture publique n'est ajoutée : product_sourcing reste
-- réservée à l'administrateur, comme à sa création.

NOTIFY pgrst, 'reload schema';
