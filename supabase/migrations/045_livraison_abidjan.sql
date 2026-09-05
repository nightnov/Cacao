-- ═══════════════════════════════════════════════════════════════════════════
-- Livraison : Abidjan seulement
--
-- La réponse citait cinq villes venues du jeu d'essai — Abidjan, Bouaké,
-- Yamoussoukro, San-Pédro et Daloa. Annoncer une livraison à Daloa alors que
-- personne ne s'y rend, c'est promettre ce qui ne sera pas tenu, et l'annonce
-- vit en base : la corriger dans le code ne change rien à ce que voit le
-- client.
--
-- Le texte ne cite plus de tarif ni de délai : les frais dépendent du quartier
-- et sont calculés au moment de la commande.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE faq_items SET answer =
  'Nous livrons dans Abidjan. Les frais dépendent de votre quartier et vous sont indiqués avant le paiement.'
WHERE question = 'Quelles sont les villes de livraison ?';

NOTIFY pgrst, 'reload schema';
