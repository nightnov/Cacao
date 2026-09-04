/**
 * Glossaire des composants : l'explication d'une pièce, valable pour tout le
 * catalogue.
 *
 * Ces textes répondent à une question qu'un acheteur n'ose pas toujours poser :
 * à quoi sert la mémoire vive, pourquoi un stockage plus grand coûte plus cher.
 * Ils ne décrivent jamais un produit particulier, seulement le rôle d'une
 * pièce — ce qui leur permet de servir sur toutes les fiches sans rien
 * promettre qui ne soit tenu.
 *
 * Ils vivent en base (table `component_glossary`) pour rester modifiables sans
 * passer par le code. Le tableau ci-dessous n'est qu'un filet de sécurité si la
 * table n'a pas encore été créée.
 */

export interface GlossaryEntry {
  key: string
  label: string
  title: string
  body: string
  image_url?: string | null
  icon: string
  sort_order: number
}

/**
 * Bloc affiché dans la section Description, quelle que soit son origine :
 * une valeur d'option configurée, ou une entrée du glossaire adossée à une
 * caractéristique du produit.
 */
export interface DescriptionBlock {
  id: string
  /** Nom du groupe : « Mémoire vive », « Processeur »… */
  group: string
  /** Valeur réelle sur ce produit : « 4 Go DDR5 ». Vide si inconnue. */
  value: string
  title: string
  body: string
  imageUrl?: string | null
  /** Pictogramme de repli quand aucune image n'est fournie. */
  icon: string
}

/**
 * Repli minimal. Volontairement court : si la table manque, mieux vaut deux
 * explications justes qu'un silence complet, mais le vrai contenu est en base.
 */
export const FALLBACK_GLOSSARY: GlossaryEntry[] = [
  {
    key: 'cpu',
    label: 'Processeur',
    title: 'Le processeur, en clair',
    body: "Le processeur exécute les calculs de la machine. C'est lui qui décide de la rapidité générale : le temps qu'un logiciel met à s'ouvrir, la fluidité quand plusieurs tâches tournent ensemble.",
    icon: 'cpu',
    sort_order: 0,
  },
  {
    key: 'ram',
    label: 'Mémoire vive',
    title: 'La mémoire vive, en clair',
    body: "La mémoire vive est le plan de travail de l'ordinateur : tout ce que vous avez ouvert y est posé le temps que vous vous en serviez. Plus elle est grande, plus vous pouvez travailler sur plusieurs choses à la fois sans ralentissement.",
    icon: 'ram',
    sort_order: 1,
  },
  {
    key: 'storage',
    label: 'Stockage',
    title: 'Le stockage, en clair',
    body: "Le stockage est l'endroit où vivent vos fichiers quand la machine est éteinte : documents, photos, logiciels. Sa capacité dit combien vous pouvez garder.",
    icon: 'storage',
    sort_order: 2,
  },
  {
    key: 'screen',
    label: 'Écran',
    title: "L'écran, en clair",
    body: "L'écran se juge sur sa taille, mesurée en pouces sur la diagonale, et sur sa définition, c'est à dire le nombre de points qui composent l'image.",
    icon: 'screen',
    sort_order: 3,
  },
]

/**
 * Devine à quelle pièce se rapporte une option saisie librement en
 * administration. « RAM », « Mémoire vive » et « Memoire » désignent la même
 * chose pour un client, et doivent donc porter la même explication.
 */
const ALIASES: [string, RegExp][] = [
  ['cpu', /processeur|cpu|puce/i],
  ['ram', /m[ée]moire|ram/i],
  ['storage', /stockage|disque|ssd|hdd/i],
  ['screen', /[ée]cran|dalle|affichage/i],
  ['gpu', /graphique|gpu|carte vid/i],
  ['battery', /batterie|autonomie/i],
  ['os', /syst[èe]me|windows|logiciel install/i],
  ['ports', /connectique|connecteur|prises?\b|ports?\b|usb|hdmi/i],
]

export function glossaryKeyFor(name: string): string | null {
  for (const [key, pattern] of ALIASES) {
    if (pattern.test(name)) return key
  }
  return null
}

/**
 * Construit les blocs de la section Description.
 *
 * Règle de priorité : ce que le vendeur a écrit sur une valeur précise passe
 * avant le glossaire. Le glossaire ne comble que les silences — mais il les
 * comble toujours, pour qu'aucune fiche ne se retrouve sans explication.
 *
 * @param configured Valeurs de configuration retenues, avec le nom de leur
 *   groupe. Vide si le produit n'a aucune configuration.
 * @param specs Caractéristiques du produit (`products.specs`), qui donnent la
 *   configuration de base d'un produit non configuré.
 */
export function buildDescriptionBlocks(
  glossary: GlossaryEntry[],
  configured: {
    id: string
    group: string
    label: string
    title?: string | null
    body?: string | null
    imageUrl?: string | null
  }[],
  specs: Record<string, unknown>
): DescriptionBlock[] {
  const byKey = new Map(glossary.map(g => [g.key, g]))
  const blocks: DescriptionBlock[] = []
  const covered = new Set<string>()

  for (const item of configured) {
    const key = glossaryKeyFor(item.group)
    if (key) covered.add(key)
    const entry = key ? byKey.get(key) : undefined

    const body = item.body?.trim() || entry?.body || ''
    // Une option purement esthétique, comme la couleur, n'a ni texte saisi ni
    // équivalent au glossaire. L'afficher produirait un cadre vide.
    if (!body) continue

    blocks.push({
      id: item.id,
      group: item.group,
      value: item.label,
      title: item.title?.trim() || entry?.title || item.group,
      body,
      imageUrl: item.imageUrl || entry?.image_url || null,
      icon: entry?.icon || 'cpu',
    })
  }

  // Caractéristiques non couvertes par la configuration : elles décrivent la
  // machine telle qu'elle est vendue, et méritent la même explication.
  for (const entry of [...glossary].sort((a, b) => a.sort_order - b.sort_order)) {
    if (covered.has(entry.key)) continue
    const value = specs?.[entry.key]
    if (value == null || String(value).trim() === '') continue

    blocks.push({
      id: `glossaire-${entry.key}`,
      group: entry.label,
      value: String(value),
      title: entry.title,
      body: entry.body,
      imageUrl: entry.image_url || null,
      icon: entry.icon,
    })
  }

  return blocks
}
