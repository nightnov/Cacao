/**
 * Calcul du prix de livraison : zone × taille de colis.
 *
 * Aucun transporteur n'est nommé, ici comme côté client. Le site affiche
 * « Livraison » et un prix ; qui porte réellement le colis se décide commande
 * par commande, en dehors du site. C'est volontaire : le prestataire peut
 * changer sans qu'une ligne de code bouge.
 *
 * Le modèle reprend celui des transporteurs locaux — une grille de tailles de
 * colis (petit, moyen, grand) croisée avec des zones. Il a l'avantage d'être
 * vérifiable : chaque case se compare à une ligne de leur tarif officiel.
 */

export const PARCEL_SIZES = ['petit', 'moyen', 'grand'] as const
export type ParcelSize = (typeof PARCEL_SIZES)[number]

/** Du moins au plus encombrant. Sert à départager un panier mixte. */
const SIZE_RANK: Record<ParcelSize, number> = { petit: 1, moyen: 2, grand: 3 }

/**
 * Taille retenue pour un produit qui n'en a pas.
 *
 * « moyen » plutôt que « petit » : mieux vaut surfacturer une souris que
 * sous-facturer un écran. Une erreur dans ce sens se voit et se corrige ; dans
 * l'autre, elle se paie sur chaque commande sans que rien ne l'indique.
 */
export const DEFAULT_PARCEL_SIZE: ParcelSize = 'moyen'

export function isParcelSize(value: unknown): value is ParcelSize {
  return typeof value === 'string' && (PARCEL_SIZES as readonly string[]).includes(value)
}

/**
 * Bornes de poids des tailles de colis, relevées sur la grille du transporteur.
 * Un poids strictement supérieur à la borne passe à la taille suivante.
 */
export const SIZE_WEIGHT_LIMITS: { size: ParcelSize; maxKg: number | null }[] = [
  { size: 'petit', maxKg: 5 },
  { size: 'moyen', maxKg: 15 },
  { size: 'grand', maxKg: null },
]

/**
 * Taille déduite d'un poids.
 *
 * Sert à pré-remplir la fiche produit : saisir « 2,3 kg » propose « petit
 * colis » sans avoir à retenir les seuils.
 *
 * Ce n'est qu'une proposition. Le transporteur retient le poids OU
 * l'encombrement, selon ce qui est le plus contraignant : un écran de
 * 27 pouces pèse 5 kg mais ne rentre dans aucune boîte de moyen colis. La
 * taille reste donc modifiable à la main.
 */
export function sizeFromWeight(kg: number | null | undefined): ParcelSize | null {
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return null
  for (const { size, maxKg } of SIZE_WEIGHT_LIMITS) {
    if (maxKg === null || kg <= maxKg) return size
  }
  return 'grand'
}

/**
 * Taille du colis pour un panier entier.
 *
 * C'est l'article le plus encombrant qui commande : un écran expédié avec un
 * clavier reste un grand colis.
 *
 * Limite assumée : plusieurs articles volumineux tiennent rarement dans un seul
 * colis, et le transporteur en facturera alors plusieurs. Le cas est trop rare
 * pour justifier un calcul de volume ; il se traite à la main, la commande
 * affichant la taille retenue.
 */
export function cartParcelSize(
  items: { parcel_size?: string | null }[],
  defaultSize: ParcelSize = DEFAULT_PARCEL_SIZE
): ParcelSize {
  let biggest: ParcelSize = items.length ? 'petit' : defaultSize

  for (const item of items) {
    const size = isParcelSize(item.parcel_size) ? item.parcel_size : defaultSize
    if (SIZE_RANK[size] > SIZE_RANK[biggest]) biggest = size
  }
  return biggest
}

export interface RouteRate {
  priceFcfa: number
  /** Délai indicatif du transporteur, en jours ouvrés. */
  delayDays: number | null
}

/** Tarifs d'un trajet donné : un par taille de colis. */
export type ZoneRates = Partial<Record<ParcelSize, RouteRate>>

export interface PickupSettings {
  enabled: boolean
  address: string | null
  hours: string | null
}

export interface DeliveryOption {
  mode: 'livraison' | 'retrait'
  label: string
  fcfa: number
  /** Détail affiché sous le prix : taille du colis, adresse et horaires. */
  detail: string
}

export const SIZE_LABELS: Record<ParcelSize, string> = {
  petit: 'Petit colis',
  moyen: 'Moyen colis',
  grand: 'Grand colis',
}

/**
 * Options proposées au client.
 *
 * Le retrait sur place est la seule échappatoire au coût du transport : dès
 * qu'un colis encombrant fait grimper la livraison, c'est lui qui évite de
 * perdre la vente. Il n'est proposé que si une adresse est renseignée —
 * annoncer un retrait sans dire où reviendrait à promettre dans le vide.
 */
export function deliveryOptions(
  rates: ZoneRates,
  size: ParcelSize,
  pickup: PickupSettings,
  fallbackFcfa: number | null
): DeliveryOption[] {
  const options: DeliveryOption[] = []

  // Sans tarif pour cette taille, on retombe sur le prix fixe de la localité
  // plutôt que d'annoncer une livraison gratuite.
  const rate = rates[size]
  const price = rate?.priceFcfa ?? fallbackFcfa

  if (price != null) {
    // Le délai est présenté comme une estimation du transporteur, jamais comme
    // un engagement de la boutique : elle ne maîtrise ni le fournisseur ni la
    // tournée du livreur.
    const delay = rate?.delayDays
    options.push({
      mode: 'livraison',
      label: 'Livraison à votre adresse',
      fcfa: price,
      detail: delay
        ? `${SIZE_LABELS[size]} · environ ${delay} jours ouvrés`
        : SIZE_LABELS[size],
    })
  }

  if (pickup.enabled && pickup.address) {
    options.push({
      mode: 'retrait',
      label: 'Retrait sur place — gratuit',
      fcfa: 0,
      detail: pickup.hours ? `${pickup.address} · ${pickup.hours}` : pickup.address,
    })
  }

  return options
}

export interface VolumeDiscountSettings {
  enabled: boolean
  thresholdFcfa: number
  percent: number
}

export const DEFAULT_VOLUME_DISCOUNT: VolumeDiscountSettings = {
  enabled: true,
  thresholdFcfa: 1_000_000,
  percent: 10,
}

/**
 * Remise accordée quand le montant des articles franchit un seuil.
 *
 * Elle s'applique toute seule, sans que le client ait à composer ni à cocher
 * quoi que ce soit. Lui demander de sélectionner les articles à regrouper
 * n'aurait aucun sens : son intérêt serait toujours de tous les prendre, écarter
 * un article ne pouvant que réduire sa remise. La sélection ne servirait donc
 * qu'à lui faire rater son avantage.
 *
 * Porte sur le montant des articles seulement, jamais sur la livraison — celle-ci
 * est un coût avancé au transporteur, la rogner reviendrait à payer de sa poche.
 */
export function volumeDiscount(
  settings: VolumeDiscountSettings,
  productsTotalFcfa: number
): number {
  const threshold = Number.isFinite(settings.thresholdFcfa)
    ? settings.thresholdFcfa
    : DEFAULT_VOLUME_DISCOUNT.thresholdFcfa
  const percent = Number.isFinite(settings.percent)
    ? settings.percent
    : DEFAULT_VOLUME_DISCOUNT.percent

  if (!settings.enabled) return 0
  if (percent <= 0 || percent > 100) return 0
  if (productsTotalFcfa < threshold) return 0

  return Math.round((productsTotalFcfa * percent) / 100)
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
