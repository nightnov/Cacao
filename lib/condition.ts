/**
 * État de l'appareil.
 *
 * Du matériel qui n'est pas systématiquement neuf : le taire serait trompeur,
 * l'afficher en gros ferait fuir avant lecture. Le libellé va donc dans les
 * caractéristiques, à la même taille que le reste.
 *
 * Les textes décrivent un fait vérifiable — l'emballage, l'usage antérieur —
 * et jamais un jugement de valeur du genre « comme neuf », qui promettrait ce
 * que personne ne peut garantir.
 */
export const ITEM_CONDITIONS: Record<string, { label: string; hint: string }> = {
  neuf_scelle: {
    label: 'Neuf, sous scellé',
    hint: "Emballage d'origine jamais ouvert.",
  },
  neuf_ouvert: {
    label: 'Neuf, carton ouvert',
    hint: "Jamais utilisé. L'emballage a été ouvert pour vérification.",
  },
  quasi_neuf: {
    label: 'Quasi neuf',
    hint: 'Très peu servi, sans marque d\'usage visible.',
  },
  reconditionne: {
    label: 'Reconditionné',
    hint: 'Remis en état et testé avant mise en vente.',
  },
}

export function conditionLabel(value: string | null | undefined): string | null {
  return (value && ITEM_CONDITIONS[value]?.label) || null
}
