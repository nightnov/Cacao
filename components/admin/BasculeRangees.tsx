'use client'

/**
 * Bascule entre la liste courante et la liste rangée.
 *
 * Le compte figure sur le bouton, et c'est le point : sans lui, rien n'indique
 * qu'il y a quelque chose derrière, et le second bloc finit ignoré. Le bouton
 * disparaît quand il n'y a rien à ranger — proposer d'ouvrir une liste vide
 * n'apprend rien et ajoute un geste.
 */
interface BasculeRangeesProps {
  actif: boolean
  onToggle: () => void
  /** Nombre d'éléments dans la liste courante. */
  compteCourant: number
  /** Nombre d'éléments rangés. */
  compteRange: number
  /** Ce qu'on affiche normalement, au pluriel. Ex. « promotions actives ». */
  nomCourant: string
  /** Ce qui est mis de côté, au pluriel. Ex. « promotions désactivées ». */
  nomRange: string
}

export function BasculeRangees({
  actif,
  onToggle,
  compteCourant,
  compteRange,
  nomCourant,
  nomRange,
}: BasculeRangeesProps) {
  if (!actif && compteRange === 0) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-ink text-ink hover:bg-ink hover:text-ink-invert transition-colors"
    >
      {actif
        ? `Revenir aux ${nomCourant} (${compteCourant})`
        : `Voir les ${nomRange} (${compteRange})`}
    </button>
  )
}
