/**
 * D'où vient un produit, côté administration uniquement.
 *
 * Le nom de la plateforme se déduit de l'adresse plutôt que de se saisir : une
 * adresse collée est une information vérifiable, un nom tapé à la main se
 * désynchronise du lien dès la première correction. Rien n'est deviné au delà
 * du domaine lui même.
 */
export interface Approvisionnement {
  product_id: string
  source_url: string | null
  platform: string | null
  external_id: string | null
  cost_fcfa: number | null
  note?: string | null
}

const CONNUES: Record<string, string> = {
  'jumia.ci': 'Jumia',
  'jumia.com': 'Jumia',
  'afrikmall.ci': 'Afrikmall',
  'coinafrique.com': 'CoinAfrique',
  'ci.coinafrique.com': 'CoinAfrique',
  'aliexpress.com': 'AliExpress',
  'amazon.com': 'Amazon',
  'amazon.fr': 'Amazon',
}

/**
 * Nom lisible de la plateforme, ou chaîne vide si l'adresse n'en est pas une.
 * Une adresse invalide ne produit pas de nom inventé : elle ne produit rien.
 */
export function plateformeDe(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const hote = new URL(url.trim()).hostname.replace(/^www\./, '').toLowerCase()
    if (CONNUES[hote]) return CONNUES[hote]
    return hote.split('.')[0].replace(/^./, c => c.toUpperCase())
  } catch {
    return ''
  }
}
