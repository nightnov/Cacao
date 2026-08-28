-- ═══════════════════════════════════════════════════════════════════════════
-- Questions fréquentes en base
--
-- Elles étaient écrites dans app/faq/page.tsx : corriger une réponse demandait
-- une modification du code et un redéploiement. C'est le contenu qui bouge le
-- plus souvent, il passe donc en base.
--
-- Les réponses sont reprises À L'IDENTIQUE de ce qui est actuellement en ligne,
-- y compris celles qui promettent des choses que le site ne fait pas (envoi
-- d'e-mails, numéro de suivi, délai de réponse). Les corriger reviendrait à
-- décider seul de la politique commerciale ; l'administration les signale à la
-- place, avec la raison, pour que le choix reste à l'exploitant.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_items_order_idx ON faq_items (sort_order, id);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_items_public_read" ON faq_items;
CREATE POLICY "faq_items_public_read" ON faq_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "faq_items_admin_write" ON faq_items;
CREATE POLICY "faq_items_admin_write" ON faq_items
  FOR ALL USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

-- Reprise du contenu actuellement en ligne. Le WHERE NOT EXISTS évite de
-- recréer les questions si la migration est relancée après des modifications.
INSERT INTO faq_items (question, answer, sort_order)
SELECT * FROM (VALUES
  ('Comment passer une commande ?',
   'Consultez notre catalogue, sélectionnez un produit, ajoutez-le au panier et procédez au paiement. Vous recevrez une confirmation par email.', 1),
  ('Quels sont les modes de paiement acceptés ?',
   'Nous acceptons Wave, Orange Money, MTN Money, Moov Money et les paiements par carte (Visa, Mastercard) via MoneyFusion.', 2),
  ('Quelles sont les villes de livraison ?',
   'Nous livrons à Abidjan, Bouaké, Yamoussoukro, San-Pédro et Daloa. Les frais de livraison varient selon la ville.', 3),
  ('Combien de temps pour la livraison ?',
   'Les délais varient de 2 à 5 jours ouvrables selon votre ville. Vous recevrez un suivi en temps réel via Yango.', 4),
  ('Y a-t-il une garantie sur les produits ?',
   'Oui ! Tous nos produits sont garantis. Les détails spécifiques dépendent du produit et du fabricant.', 5),
  ('Puis-je retourner un produit ?',
   'Oui, vous disposez de 14 jours après réception pour retourner un produit non utilisé. Contactez-nous pour les modalités.', 6),
  ('Comment puis-je suivre ma commande ?',
   'Une fois votre commande expédiée, vous recevrez un numéro de suivi Yango par email et SMS pour suivre votre colis en temps réel.', 7),
  ('Avez-vous un support client ?',
   'Oui ! Vous pouvez nous contacter par email à contact@cacao.ci ou via le formulaire de contact. Réponse sous 24h.', 8)
) AS seed(question, answer, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM faq_items);
