-- ═══════════════════════════════════════════════════════════════════════════
-- Glossaire : Système et Connectique
--
-- La fiche produit sait désormais saisir huit caractéristiques, mais le
-- glossaire n'en expliquait que six. Un vendeur qui renseignait « Windows 11 »
-- ou « 2 USB, 1 HDMI » voyait donc sa saisie disparaître : sans texte
-- correspondant, le bloc ne s'affiche pas.
--
-- Comme les six premières, ces explications décrivent le rôle d'une pièce et
-- rien de plus. Aucune marque n'est recommandée, aucune performance promise :
-- un seul texte sert tout le catalogue, et ce qui est écrit ici sera lu sous
-- des produits très différents.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO component_glossary (key, label, title, body, icon, sort_order) VALUES
(
  'os', 'Système', 'Le système, en clair',
  'Le système d''exploitation est le logiciel qui fait fonctionner la machine. C''est lui que vous voyez au démarrage, lui qui affiche le bureau et les fenêtres, et lui qui permet aux autres logiciels de tourner.

Sans système, un ordinateur allumé n''affiche rien d''utilisable. Chaque famille de systèmes a ses logiciels : un programme écrit pour l''un ne s''installe pas forcément sur l''autre.

Ce qu''il faut retenir avant d''acheter : vérifiez que les logiciels dont vous avez besoin pour votre travail ou vos études existent bien sur le système indiqué. C''est la question à se poser avant celle de la puissance.',
  'os', 6
),
(
  'ports', 'Connectique', 'La connectique, en clair',
  'La connectique, ce sont les prises de l''appareil : celles où vous branchez une clé, un écran, un casque ou le chargeur. On les appelle aussi des ports.

Leur nombre décide de ce que vous pouvez brancher en même temps, et leur type décide de ce que vous pouvez brancher tout court. Une prise ronde, une prise plate et une prise d''écran ne se remplacent pas entre elles.

Ce qu''il faut retenir avant d''acheter : faites la liste de ce que vous branchez aujourd''hui. S''il manque une prise, un adaptateur ou un concentrateur peut la fournir, mais c''est un accessoire de plus à transporter et à ne pas oublier.',
  'ports', 7
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
