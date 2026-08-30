-- ═══════════════════════════════════════════════════════════════════════════
-- Remise sur gros panier
--
-- Au-delà d'un montant d'articles, une remise s'applique. Elle est ACCORDÉE
-- AUTOMATIQUEMENT, sans que le client ait à composer quoi que ce soit.
--
-- Pourquoi pas une sélection manuelle : si le client devait cocher les
-- articles à regrouper, son intérêt serait toujours de tous les cocher —
-- écarter un article ne peut que réduire sa remise. L'écran de sélection
-- n'ajouterait donc qu'une manipulation permettant de rater son avantage.
--
-- La remise ne se cumule pas avec un code promotionnel : c'est la plus
-- avantageuse des deux qui s'applique. Les cumuler donnerait vite 20 % ou plus
-- sur des montants à sept chiffres.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO site_settings (key, value) VALUES
  ('volume_discount_threshold_fcfa', '1000000'),
  ('volume_discount_percent', '10'),
  ('volume_discount_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
