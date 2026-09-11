/**
 * Remplissage de la vitrine de l'accueil.
 *
 * Deux façons de décider ce qui s'y affiche :
 *
 * - « auto » classe au nombre de vues. Utile quand le catalogue est assez
 *   fourni pour que la demande veuille dire quelque chose.
 * - « choisi » n'affiche que les produits marqués. Sur un petit catalogue,
 *   l'automatique revient à tout montrer, y compris les fiches dont la photo
 *   n'est pas présentable. La vitrine est la première chose que voit un
 *   visiteur : elle ne peut pas être subie.
 *
 * Le mode ne masque jamais un produit du catalogue. Il décide seulement de ce
 * qui est mis en avant.
 */

export type VitrineMode = 'auto' | 'choisi'

export const VITRINE_SETTING_KEYS = ['vitrine_mode'] as const

export const VITRINE_MODE_DEFAUT: VitrineMode = 'auto'

/**
 * Lit le mode dans les lignes brutes de `site_settings`.
 *
 * Une clé absente ou illisible vaut « auto » : tant que la migration n'a pas
 * été exécutée, l'accueil doit garder l'aspect qu'il avait, pas se vider.
 */
export function parseVitrineMode(
  rows: { key: string; value: string | null }[] | null | undefined
): VitrineMode {
  const brut = (rows || []).find(r => r.key === 'vitrine_mode')?.value
  return brut === 'choisi' ? 'choisi' : VITRINE_MODE_DEFAUT
}

interface Candidat {
  id: string
  mis_en_avant?: boolean | null
  rang_vitrine?: number | null
  view_count?: number
}

/**
 * Produits à montrer en vitrine, dans l'ordre.
 *
 * En mode choisi, l'ordre suit le rang que vous avez donné ; les produits
 * retenus sans rang viennent ensuite, au nombre de vues.
 *
 * Le repli est délibéré : si le mode est « choisi » mais qu'aucun produit
 * n'est encore marqué, on retombe sur le classement automatique plutôt que
 * d'afficher une vitrine vide. Une section vide sur l'accueil ressemble à une
 * page cassée, et ce cas se produit forcément — juste après avoir changé de
 * mode, avant d'avoir coché quoi que ce soit.
 */
export function produitsEnVitrine<T extends Candidat>(produits: T[], mode: VitrineMode): T[] {
  const parVues = (a: Candidat, b: Candidat) => (b.view_count || 0) - (a.view_count || 0)

  if (mode === 'choisi') {
    const retenus = produits.filter(p => p.mis_en_avant)
    if (retenus.length > 0) {
      return [...retenus].sort((a, b) => {
        const ra = a.rang_vitrine ?? Number.MAX_SAFE_INTEGER
        const rb = b.rang_vitrine ?? Number.MAX_SAFE_INTEGER
        return ra === rb ? parVues(a, b) : ra - rb
      })
    }
  }

  return [...produits].sort(parVues)
}
