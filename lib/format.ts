/**
 * Formatage des montants.
 *
 * `Number.toLocaleString('fr-CI')` sépare les milliers avec U+202F (espace fine
 * insécable). Ce caractère s'affiche de façon très inégale selon la police et le
 * navigateur : souvent quasi invisible, parfois rendu en carré vide. Résultat,
 * « 299 000 » se lit « 299000 » et le client ne peut plus estimer le montant
 * d'un coup d'œil.
 *
 * On impose donc une virgule, toujours visible, quelle que soit la police.
 */
export function formatAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0'
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Montant suivi de la devise, ex. « 299,000 FCFA ». */
export function formatPrice(value: number | null | undefined): string {
  return `${formatAmount(value)} FCFA`
}
