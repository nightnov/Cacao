/**
 * Nettoyage des textes affichés au client.
 *
 * Aucun tiret ne doit apparaître dans les libellés, titres et descriptions vus
 * par le client. Or les descriptions viennent de l'administration, et une fiche
 * fournisseur recopiée telle quelle en contient presque toujours :
 * « HP Laptop 14-em0002wm – AMD Athlon 7120U – 4GB RAM ».
 *
 * On corrige donc à l'affichage plutôt que de réécrire les données : le texte
 * saisi reste intact en base, et la règle s'applique aussi aux contenus à venir
 * sans qu'il faille y penser.
 */

/**
 * Remplace les tirets de PONCTUATION par une virgule.
 *
 * Uniquement les tirets entourés d'espaces, ou suivis d'un espace en début de
 * segment. Un tiret collé à ses voisins appartient à un mot ou à une référence
 * — « 14-em0002wm », « Core i7-1255U », « sous-titre » — et le remplacer
 * abîmerait la référence du produit, ce qui est pire que le tiret lui-même.
 */
export function stripDashes(input: string | null | undefined): string {
  if (!input) return ''
  return (
    input
      // « mot — mot » et « mot – mot » : ponctuation, donc virgule.
      .replace(/\s+[—–]\s+/g, ', ')
      // « mot –mot » : espace d'un seul côté, fréquent dans les fiches
      // recopiées. On garde l'espace pour ne pas coller les deux mots.
      .replace(/\s+[—–]/g, ', ')
      .replace(/[—–]\s+/g, ', ')
      // Un tiret cadratin isolé, sans espace autour, reste une ponctuation :
      // il n'existe pas de mot français qui en contienne.
      .replace(/[—–]/g, ', ')
      // La normalisation peut produire « , , » quand deux tirets se suivaient.
      .replace(/(,\s*){2,}/g, ', ')
      .trim()
  )
}
