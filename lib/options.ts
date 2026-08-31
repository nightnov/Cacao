/**
 * Configuration produit : options, valeurs et calcul du prix.
 *
 * Chaque VALEUR porte son écart de prix, et le prix affiché vaut
 * « prix de base + somme des écarts choisis ». Le modèle précédent demandait un
 * prix par combinaison complète : quatre options à trois valeurs faisaient
 * 81 lignes à saisir pour un seul produit.
 *
 * Tout ce qui est calculé ici sert à l'AFFICHAGE. Le montant facturé est
 * recalculé côté serveur à partir des identifiants de valeurs, voir
 * `lib/pricing.server.ts`.
 */

/** `single` : la nouvelle valeur remplace. `multiple` : elles s'additionnent. */
export type SelectionMode = 'single' | 'multiple'

export interface OptionValue {
  id: string
  option_id: string
  label: string
  price_delta_fcfa: number
  image_url: string | null
  description: string | null
  block_title: string | null
  block_image_url: string | null
  block_body: string | null
  block_sort_order?: number
  is_active: boolean
  is_default: boolean
  sort_order: number
}

export interface ProductOption {
  id: string
  product_id: string
  name: string
  sort_order: number
  selection_mode?: SelectionMode
  values: OptionValue[]
}

/**
 * Valeurs retenues, par option.
 *
 * Une LISTE et non une valeur unique, même en choix unique : c'est ce qui
 * permet au stockage d'en cumuler plusieurs sans dupliquer toute la mécanique.
 * En choix unique, la liste ne contient jamais plus d'un élément.
 */
export type Selection = Record<string, string[]>

export function optionMode(option: ProductOption): SelectionMode {
  // Défaut prudent : le choix unique ne peut pas produire une facture absurde
  // du type « 16 Go + 32 Go », contrairement au cumul.
  return option.selection_mode === 'multiple' ? 'multiple' : 'single'
}

/** Valeurs proposables au client : les valeurs inactives restent en base. */
export function activeValues(option: ProductOption): OptionValue[] {
  return option.values.filter(v => v.is_active)
}

/**
 * Sélection à l'ouverture de la fiche, dite « configuration de base ».
 *
 * On retient la valeur marquée par défaut en administration ; à défaut, la
 * première valeur active. Laisser une option sans réponse afficherait un prix
 * incomplet et bloquerait l'achat sans que le client comprenne pourquoi.
 *
 * Même en choix multiple, une seule valeur est présélectionnée : c'est au
 * client d'ajouter un second disque, pas au site de le décider pour lui.
 */
export function defaultSelection(options: ProductOption[]): Selection {
  const selection: Selection = {}
  for (const option of options) {
    const values = activeValues(option)
    if (values.length === 0) continue
    const chosen = values.find(v => v.is_default) || values[0]
    selection[option.id] = [chosen.id]
  }
  return selection
}

/**
 * Applique un clic sur une valeur.
 *
 * En choix unique, la valeur remplace la précédente : sélectionner 32 Go après
 * 16 Go doit donner 32 Go, jamais les deux.
 *
 * En choix multiple, elle s'ajoute ou se retire. La dernière valeur ne peut pas
 * être retirée : une option sans réponse afficherait un prix incomplet.
 */
export function toggleValue(
  option: ProductOption,
  selection: Selection,
  valueId: string
): Selection {
  const current = selection[option.id] || []

  if (optionMode(option) === 'single') {
    return { ...selection, [option.id]: [valueId] }
  }

  if (current.includes(valueId)) {
    if (current.length === 1) return selection
    return { ...selection, [option.id]: current.filter(id => id !== valueId) }
  }
  return { ...selection, [option.id]: [...current, valueId] }
}

/** Valeurs retenues, dans l'ordre d'affichage des options puis des valeurs. */
export function selectedValues(options: ProductOption[], selection: Selection): OptionValue[] {
  const out: OptionValue[] = []
  for (const option of options) {
    const ids = selection[option.id] || []
    for (const value of option.values) {
      if (ids.includes(value.id)) out.push(value)
    }
  }
  return out
}

/** Valeurs de la configuration de base, telle que définie en administration. */
export function baseValues(options: ProductOption[]): OptionValue[] {
  return selectedValues(options, defaultSelection(options))
}

/**
 * Prix pour une sélection donnée.
 *
 * Borné à zéro : un cumul de réductions ne doit pas afficher un prix négatif.
 * La même borne existe côté serveur, où elle fait foi.
 */
export function configuredPrice(
  basePrice: number,
  options: ProductOption[],
  selection: Selection
): number {
  const extra = selectedValues(options, selection).reduce(
    (sum, v) => sum + (Number(v.price_delta_fcfa) || 0),
    0
  )
  return Math.max(0, basePrice + extra)
}

/** Identifiants transmis au panier, seule donnée qui compte au paiement. */
export function selectionIds(options: ProductOption[], selection: Selection): string[] {
  return selectedValues(options, selection).map(v => v.id)
}

/**
 * Résumé lisible, par exemple « Noir, 1 To, 16 Go ».
 *
 * Séparé par des virgules et non par des tirets : les tirets sont proscrits
 * dans les textes affichés au client.
 */
export function configLabel(options: ProductOption[], selection: Selection): string {
  return selectedValues(options, selection)
    .map(v => v.label)
    .join(', ')
}

/**
 * Image imposée par la configuration.
 *
 * La dernière valeur choisie qui porte une image l'emporte, en pratique la
 * couleur. Une option sans image ne remplace rien plutôt que d'effacer le
 * visuel du produit.
 */
export function selectionImage(options: ProductOption[], selection: Selection): string | null {
  const withImage = selectedValues(options, selection).filter(v => v.image_url)
  return withImage.length > 0 ? withImage[withImage.length - 1].image_url : null
}

/** Vrai quand le client s'est écarté de la configuration de base. */
export function differsFromBase(options: ProductOption[], selection: Selection): boolean {
  const base = defaultSelection(options)
  for (const option of options) {
    const a = [...(selection[option.id] || [])].sort().join(',')
    const b = [...(base[option.id] || [])].sort().join(',')
    if (a !== b) return true
  }
  return false
}

/**
 * Regroupe les lignes plates renvoyées par la base en options ordonnées.
 *
 * Les valeurs inactives sont conservées ici : la fiche produit les filtre pour
 * l'affichage, mais l'administration a besoin de les voir pour les réactiver.
 */
export function groupOptions(
  rawOptions: {
    id: string
    product_id: string
    name: string
    sort_order: number
    selection_mode?: SelectionMode
  }[],
  rawValues: OptionValue[]
): ProductOption[] {
  return [...rawOptions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(o => ({
      ...o,
      values: rawValues
        .filter(v => v.option_id === o.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    // Une option sans aucune valeur n'a rien à proposer : elle afficherait un
    // titre suivi du vide.
    .filter(o => o.values.length > 0)
}
