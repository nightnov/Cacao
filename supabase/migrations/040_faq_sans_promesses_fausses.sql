-- ═══════════════════════════════════════════════════════════════════════════
-- FAQ : retrait des affirmations que le site ne peut pas tenir
--
-- Quatre réponses annonçaient des choses qui n'existent pas :
--
--   • un transporteur nommé, alors qu'aucun accord ne lie CACAO à cette
--     société. La citer l'engage sans son consentement, et le livreur est de
--     toute façon choisi commande par commande ;
--   • un « suivi en temps réel », alors que l'état d'une commande est saisi à
--     la main depuis l'administration ;
--   • un envoi de confirmation et de numéro de suivi « par e-mail et SMS »,
--     alors qu'aucun envoi d'e-mail ni de SMS n'est installé dans le projet ;
--   • une adresse de contact écrite en dur et une réponse « sous 24 h »,
--     alors que l'adresse réelle se règle dans l'administration et qu'aucun
--     délai n'est garanti.
--
-- Le texte de remplacement ne décrit que ce qui fonctionne réellement : le
-- suivi depuis l'espace client, et le code remis au livreur.
--
-- La mise à jour se fait par question, sans toucher aux autres lignes ni à
-- celles que vous auriez ajoutées vous même.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE faq_items SET answer =
  'Consultez notre catalogue, sélectionnez un produit, ajoutez-le au panier et procédez au paiement. Votre commande apparaît aussitôt dans votre espace client, où vous pouvez la retrouver à tout moment.'
WHERE question = 'Comment passer une commande ?';

UPDATE faq_items SET answer =
  'Le délai dépend de votre ville et de la disponibilité du produit. Nous vous l''indiquons à la confirmation de votre commande, et vous suivez l''avancement depuis votre compte.'
WHERE question = 'Combien de temps pour la livraison ?';

UPDATE faq_items SET answer =
  'Connectez-vous et ouvrez Mon compte : l''état de votre commande y est affiché, de la confirmation à la livraison. Vous y trouvez aussi votre code de livraison, à donner au livreur au moment de la remise du colis.'
WHERE question = 'Comment puis-je suivre ma commande ?';

UPDATE faq_items SET answer =
  'Oui. Écrivez-nous par le formulaire de contact, ou aux coordonnées indiquées sur la page Contact. Nous répondons dès que possible.'
WHERE question = 'Avez-vous un support client ?';

-- Villes de livraison : la liste n'est pas corrigée ici parce qu'elle dépend
-- des zones que vous avez réellement configurées dans l'écran Livraison.
-- Vérifiez que les villes citées dans cette réponse correspondent bien à vos
-- zones, et corrigez la depuis l'administration si ce n'est pas le cas.

NOTIFY pgrst, 'reload schema';
