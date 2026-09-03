-- ═══════════════════════════════════════════════════════════════════════════
-- Glossaire des composants : une explication par pièce, valable pour tout le
-- catalogue
--
-- Jusqu'ici, la section Description ne montrait quelque chose que si le
-- vendeur avait saisi un bloc explicatif sur CHAQUE valeur de CHAQUE produit.
-- Résultat : une fiche non configurée n'expliquait rien, alors que c'est
-- justement le client qui découvre l'informatique qui a besoin de ces textes.
--
-- Ce glossaire est écrit une seule fois. Sur chaque fiche, le bloc s'affiche
-- avec la valeur réelle du produit en sous-titre (« 4 Go DDR5 »), et un bloc
-- saisi sur une option précise reste prioritaire quand il existe.
--
-- Les textes ci-dessous sont rédigés pour CACAO : ils décrivent le rôle d'une
-- pièce, sans promettre de performance ni citer de marque. Ils sont modifiables
-- ligne par ligne, et l'illustration peut être remplacée par votre propre
-- photo via `image_url`.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS component_glossary (
  -- Correspond aux clés déjà employées dans products.specs : cpu, ram,
  -- storage, screen. Une clé inconnue est simplement ignorée à l'affichage.
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  -- Vide par défaut : un pictogramme vectoriel du site prend le relais tant
  -- qu'aucune photo n'a été téléversée.
  image_url TEXT,
  -- Nom du pictogramme de repli. Valeurs reconnues par la fiche produit :
  -- cpu, ram, storage, screen, gpu, battery.
  icon TEXT NOT NULL DEFAULT 'cpu',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE component_glossary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "glossary_public_read" ON component_glossary;
CREATE POLICY "glossary_public_read" ON component_glossary FOR SELECT USING (true);

DROP POLICY IF EXISTS "glossary_admin_write" ON component_glossary;
CREATE POLICY "glossary_admin_write" ON component_glossary FOR ALL
  USING (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff')
  WITH CHECK (auth.uid() = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff');

INSERT INTO component_glossary (key, label, title, body, icon, sort_order) VALUES
(
  'cpu', 'Processeur', 'Le processeur, en clair',
  'Le processeur est la pièce qui exécute les calculs de la machine. C''est lui qui décide de la rapidité générale : le temps que met un logiciel à s''ouvrir, la fluidité quand plusieurs tâches tournent ensemble.

On le compare à un cerveau, mais l''image la plus juste est celle d''un ouvrier : plus il travaille vite et plus il a de bras (on parle de cœurs), plus il abat de travail dans le même temps.

Ce qu''il faut retenir avant d''acheter : un processeur d''entrée de gamme suffit largement pour naviguer sur internet, écrire des documents et regarder des vidéos. Un modèle supérieur ne se justifie que si vous montez des vidéos, travaillez sur de gros tableaux ou jouez.',
  'cpu', 0
),
(
  'ram', 'Mémoire vive', 'La mémoire vive, en clair',
  'La mémoire vive, souvent appelée RAM, est le plan de travail de l''ordinateur. Tout ce que vous avez ouvert y est posé le temps que vous vous en serviez, puis disparaît à l''extinction.

Un petit bureau vous oblige à ranger un dossier avant d''en ouvrir un autre. Un grand bureau vous laisse tout étaler. C''est exactement la différence que vous ressentez : avec peu de mémoire, la machine ralentit dès que plusieurs applications sont ouvertes.

Ce qu''il faut retenir avant d''acheter : la mémoire vive ne conserve rien. Elle ne remplace pas le stockage, elle décide seulement de votre confort quand vous travaillez sur plusieurs choses à la fois.',
  'ram', 1
),
(
  'storage', 'Stockage', 'Le stockage, en clair',
  'Le stockage est l''endroit où vivent vos fichiers quand la machine est éteinte : vos documents, vos photos, vos logiciels, le système lui même.

Deux choses comptent. La capacité, exprimée en gigaoctets ou en téraoctets, qui dit combien vous pouvez garder. Et la technologie : un disque SSD n''a aucune pièce en mouvement, ce qui rend le démarrage et l''ouverture des logiciels nettement plus rapides qu''avec un disque mécanique.

Ce qu''il faut retenir avant d''acheter : la capacité se voit vite consommée par les photos et les vidéos. Si vous hésitez, sachez qu''un disque externe peut compléter le stockage plus tard, alors que la technologie interne, elle, ne se change pas facilement.',
  'storage', 2
),
(
  'screen', 'Écran', 'L''écran, en clair',
  'L''écran se juge sur deux points : sa taille, mesurée en pouces sur la diagonale, et sa définition, c''est à dire le nombre de points qui composent l''image.

Un grand écran offre plus de confort pour travailler longtemps ou afficher deux fenêtres côte à côte. Un écran plus compact rend l''appareil plus léger et plus facile à transporter. Il n''y a pas de bon choix dans l''absolu, seulement celui qui correspond à votre usage.

Ce qu''il faut retenir avant d''acheter : si l''appareil vous suit partout, privilégiez la compacité. S''il reste posé sur un bureau, la surface d''affichage compte davantage.',
  'screen', 3
),
(
  'gpu', 'Carte graphique', 'La carte graphique, en clair',
  'La carte graphique calcule tout ce que vous voyez à l''écran. Sur un usage courant, celle intégrée au processeur suffit sans que vous ayez à y penser.

Une carte dédiée devient utile pour trois usages précis : les jeux vidéo récents, le montage vidéo, et la modélisation en trois dimensions. Elle prend en charge un travail que le processeur ferait beaucoup plus lentement.

Ce qu''il faut retenir avant d''acheter : en dehors de ces trois usages, une carte dédiée coûte plus cher, consomme davantage et ne se ressentira pas au quotidien.',
  'gpu', 4
),
(
  'battery', 'Batterie', 'La batterie, en clair',
  'La batterie détermine combien de temps l''appareil fonctionne sans être branché. Son autonomie dépend autant de la capacité annoncée que de ce que vous faites : lire un document consomme peu, une visioconférence beaucoup plus.

C''est aussi une pièce d''usure. Sa capacité diminue progressivement avec les années et les cycles de charge, sur tous les appareils, quelle que soit la marque.

Ce qu''il faut retenir avant d''acheter : les autonomies annoncées par les fabricants sont mesurées en usage léger. Comptez moins dans la vie réelle, et prévoyez le chargeur si vos journées sont longues.',
  'battery', 5
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
