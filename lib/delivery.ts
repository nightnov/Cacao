/**
 * Calcul du prix de livraison : zone × poids.
 *
 * Aucun transporteur n'est nommé, ici comme côté client. Le site affiche
 * « Livraison » et un prix ; qui porte réellement le colis se décide commande
 * par commande, en dehors du site. C'est volontaire : le prestataire peut
 * changer sans qu'une ligne de code bouge.
 *
 * Le prix vient d'une grille en base — une liste de tranches de poids par zone.
 * C'est le modèle qu'emploient les transporteurs locaux, et il a l'avantage
 * d'être vérifiable : on peut comparer une ligne de la grille à un vrai devis.
 */

/** Une tranche de poids pour une zone. `maxKg` à null = tranche ouverte. */
export interface WeightBracket {
  maxKg: number | null
  priceFcfa: number
  /** Supplément par kilo au-delà de la tranche, quand elle est ouverte. */
  extraPerKgFcfa: number
}

export interface DeliveryOption {
  mode: 'livraison' | 'retrait'
  label: string
  fcfa: number
  /** Détail affiché sous le prix : poids retenu, tranche, horaires du retrait. */
  detail: string
  available: boolean
}

/**
 * Poids retenu quand un produit n'a pas de poids renseigné.
 *
 * Sans repli, un produit sans poids ne pèserait rien et tomberait dans la
 * tranche la moins chère — la livraison serait sous-facturée sans que personne
 * le remarque. Trois kilos correspondent à un portable dans son carton.
 */
export const DEFAULT_WEIGHT_KG = 3

/** Poids total d'un panier, en kilogrammes. */
export function cartWeightKg(
  items: { weight_kg?: number | null; quantity: number }[],
  defaultWeightKg = DEFAULT_WEIGHT_KG
): number {
  const total = items.reduce((sum, item) => {
    const unit = item.weight_kg != null && item.weight_kg > 0 ? item.weight_kg : defaultWeightKg
    return sum + unit * Math.max(1, item.quantity)
  }, 0)
  return Math.round(total * 100) / 100
}

/**
 * Prix de la livraison pour un poids donné.
 *
 * Les tranches sont parcourues de la plus légère à la plus lourde ; la première
 * dont la borne couvre le poids l'emporte. La tranche ouverte (`maxKg` null)
 * ferme la marche et facture le surplus au kilo, pour qu'un colis très lourd
 * produise un prix au lieu de bloquer la commande.
 */
export function priceForWeight(
  brackets: WeightBracket[],
  weightKg: number
): { fcfa: number; bracket: WeightBracket } | null {
  if (!brackets.length) return null

  // Les tranches fermées d'abord, dans l'ordre croissant ; l'ouverte en dernier.
  const sorted = [...brackets].sort((a, b) => {
    if (a.maxKg === null) return 1
    if (b.maxKg === null) return -1
    return a.maxKg - b.maxKg
  })

  for (const bracket of sorted) {
    if (bracket.maxKg === null) {
      const last = sorted[sorted.length - 2]
      const from = last?.maxKg ?? 0
      const extra = Math.max(0, weightKg - from)
      return {
        fcfa: bracket.priceFcfa + Math.ceil(extra) * bracket.extraPerKgFcfa,
        bracket,
      }
    }
    if (weightKg <= bracket.maxKg) {
      return { fcfa: bracket.priceFcfa, bracket }
    }
  }

  // Aucune tranche ouverte et poids au-delà de la dernière : on retient la plus
  // chère plutôt que de renvoyer zéro.
  const heaviest = sorted[sorted.length - 1]
  return { fcfa: heaviest.priceFcfa, bracket: heaviest }
}

export interface PickupSettings {
  enabled: boolean
  address: string | null
  hours: string | null
}

/**
 * Options proposées au client.
 *
 * Le retrait sur place est la seule échappatoire au coût du transport : dès
 * qu'un colis lourd fait grimper la livraison, c'est lui qui évite de perdre
 * la vente. Il n'est proposé que si une adresse de retrait est renseignée —
 * annoncer un retrait sans dire où reviendrait à promettre dans le vide.
 */
export function deliveryOptions(
  brackets: WeightBracket[],
  weightKg: number,
  pickup: PickupSettings
): DeliveryOption[] {
  const options: DeliveryOption[] = []

  const priced = priceForWeight(brackets, weightKg)
  if (priced) {
    const b = priced.bracket
    options.push({
      mode: 'livraison',
      label: 'Livraison à votre adresse',
      fcfa: priced.fcfa,
      detail:
        b.maxKg === null
          ? `Colis de ${formatKg(weightKg)}`
          : `Colis de ${formatKg(weightKg)} — tranche jusqu’à ${formatKg(b.maxKg)}`,
      available: true,
    })
  }

  if (pickup.enabled && pickup.address) {
    options.push({
      mode: 'retrait',
      label: 'Retrait sur place — gratuit',
      fcfa: 0,
      detail: pickup.hours ? `${pickup.address} · ${pickup.hours}` : pickup.address,
      available: true,
    })
  }

  return options
}

export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10
  return `${rounded.toString().replace('.', ',')} kg`
}

/** Lien de carte à transmettre au livreur. */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/**
 * Une position trop imprécise ne sert à rien au livreur.
 *
 * Un téléphone dont le GPS est actif donne 10 à 50 m. Un ordinateur qui se
 * repère au Wi-Fi ou à l'adresse IP peut se tromper de plusieurs kilomètres :
 * autant ne rien transmettre que d'envoyer le livreur dans une autre commune.
 */
export const MAX_ACCURACY_M = 2000

export function accuracyIsUsable(accuracyM: number | null | undefined): boolean {
  return accuracyM != null && accuracyM <= MAX_ACCURACY_M
}
