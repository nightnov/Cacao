/**
 * Configuration produit : options, valeurs et calcul du prix.
 *
 * Chaque VALEUR porte son écart de prix, et le prix affiché vaut
 * « prix de base + somme des écarts choisis ». Le modèle précédent demandait un
 * prix par combinaison complète : quatre options à trois valeurs faisaient
 * 81 lignes à saisir pour un seul produit.
 *
 * Tout ce qui est calculé ici sert à l'AFFICHAGE. Le montant facturé est
 * recalculé côté serveur à partir des identifiants de valeurs — voir
 * `lib/pricing.server.ts`.
 */

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
  is_active: boolean
  is_default: boolean
  sort_order: number
}

export interface ProductOption {
  id: string
  product_id: string
  name: string
  sort_order: number
  values: OptionValue[]
}

/** Valeurs proposables au client : les valeurs inactives restent en base. */
export function activeValues(option: ProductOption): OptionValue[] {
  return option.values.filter(v => v.is_active)
}

/**
 * Sélection à l'ouverture de la fiche.
 *
 * On retient la valeur marquée par défaut en administration ; à défaut, la
 * première valeur active. Laisser une option sans réponse afficherait un prix
 * incomplet et bloquerait l'ajout au panier sans que le client comprenne
 * pourquoi.
 */
export function defaultSelection(options: ProductOption[]): Record<string, string> {
  const selection: Record<string, string> = {}
  for (const option of options) {
    const values = activeValues(option)
    if (values.length === 0) continue
    const chosen = values.find(v => v.is_default) || values[0]
    selection[option.id] = chosen.id
  }
  return selection
}

/** Valeurs retenues, dans l'ordre d'affichage des options. */
export function selectedValues(
  options: ProductOption[],
  selection: Record<string, string>
): OptionValue[] {
  const out: OptionValue[] = []
  for (const option of options) {
    const value = option.values.find(v => v.id === selection[option.id])
    if (value) out.push(value)
  }
  return out
}

/**
 * Prix affiché pour la configuration retenue.
 *
 * Borné à zéro : un cumul de réductions ne doit pas afficher un prix négatif.
 * La même borne existe côté serveur, où elle fait foi.
 */
export function configuredPrice(
  basePrice: number,
  options: ProductOption[],
  selection: Record<string, string>
): number {
  const extra = selectedValues(options, selection).reduce(
    (sum, v) => sum + (Number(v.price_delta_fcfa) || 0),
    0
  )
  return Math.max(0, basePrice + extra)
}

/** Identifiants transmis au panier, seule donnée qui compte au paiement. */
export function selectionIds(
  options: ProductOption[],
  selection: Record<string, string>
): string[] {
  return selectedValues(options, selection).map(v => v.id)
}

/** Résumé lisible, par exemple « Noir · 1 To · 16 Go ». */
export function configLabel(
  options: ProductOption[],
  selection: Record<string, string>
): string {
  return selectedValues(options, selection)
    .map(v => v.label)
    .join(' · ')
}

/**
 * Image imposée par la configuration.
 *
 * La dernière valeur choisie qui porte une image l'emporte — en pratique, la
 * couleur. Une option sans image ne remplace rien plutôt que d'effacer le
 * visuel du produit.
 */
export function selectionImage(
  options: ProductOption[],
  selection: Record<string, string>
): string | null {
  const withImage = selectedValues(options, selection).filter(v => v.image_url)
  return withImage.length > 0 ? withImage[withImage.length - 1].image_url : null
}

/**
 * Regroupe les lignes plates renvoyées par la base en options ordonnées.
 *
 * Les valeurs inactives sont conservées ici : la fiche produit les filtre pour
 * l'affichage, mais l'administration a besoin de les voir pour les réactiver.
 */
export function groupOptions(
  rawOptions: { id: string; product_id: string; name: string; sort_order: number }[],
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
