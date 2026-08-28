/**
 * Calcul du prix de livraison.
 *
 * Yango facture à la distance parcourue. Son API B2B sait renvoyer un devis,
 * mais elle exige une clé obtenue par contrat partenaire
 * (integration-support@yango.com) : tant qu'elle n'est pas là, on reproduit la
 * même logique localement.
 *
 * Tout est concentré ici pour que le remplacement par un vrai devis Yango se
 * fasse en un seul endroit, sans toucher au tunnel de commande ni à l'admin.
 */

export interface DeliveryTariff {
  /** Point de retrait : le domicile ou le dépôt d'où part le livreur. */
  pickupLat: number | null
  pickupLng: number | null
  /** Prise en charge, avant même le premier kilomètre. */
  baseFcfa: number
  perKmFcfa: number
  /**
   * La distance à vol d'oiseau sous-estime toujours le trajet réel : le livreur
   * suit des rues, contourne la lagune, traverse par un pont. Ce coefficient
   * rapproche l'estimation de la distance routière. 1,4 est une valeur de
   * départ courante en ville ; à ajuster en comparant avec de vraies courses.
   */
  roadFactor: number
  minFcfa: number
  /** Plafond : au-delà, le client renoncerait à commander. */
  maxFcfa: number
}

/**
 * Valeurs calibrées sur la géographie réelle d'Abidjan, depuis Yopougon.
 *
 * Le district s'étale sur une trentaine de kilomètres de route : d'Attécoubé
 * (6 km) à Bingerville (31 km). Une grille plus raide — 1 000 + 100 F/km, par
 * exemple — envoie dix communes sur douze contre le plafond de 2 000, ce qui
 * revient à un tarif unique et rend le calcul inutile.
 *
 * 1 300 + 20 F/km étale correctement : Attécoubé 1 500, Plateau 1 600,
 * Abobo 1 700, Koumassi 1 800, Bingerville 2 000, sans jamais plafonner.
 *
 * Ce sont des valeurs de départ, pas des coûts constatés. À corriger après
 * comparaison avec de vraies courses Yango.
 */
export const DEFAULT_TARIFF: DeliveryTariff = {
  pickupLat: null,
  pickupLng: null,
  baseFcfa: 1300,
  perKmFcfa: 20,
  roadFactor: 1.4,
  minFcfa: 1500,
  maxFcfa: 2000,
}

/**
 * Distance à vol d'oiseau entre deux points, en kilomètres.
 *
 * Formule de haversine : elle tient compte de la courbure de la Terre. Sur les
 * quelques kilomètres d'une ville, une simple différence de coordonnées
 * suffirait presque, mais la longitude se resserre en s'éloignant de
 * l'équateur et l'erreur deviendrait visible sur les longues courses.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // rayon moyen de la Terre, en km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export interface DeliveryQuote {
  fcfa: number
  /** Distance routière estimée, en km. Nulle si la position est inconnue. */
  km: number | null
  /** Comment le prix a été obtenu — affiché au client et gardé en commande. */
  method: 'distance' | 'commune' | 'defaut'
  /** Vrai si le plafond a été atteint : la course coûte peut-être plus cher. */
  capped: boolean
}

/**
 * Prix de la livraison.
 *
 * Deux sources, dans cet ordre :
 *   1. la position exacte du client, quand il l'a partagée → prix à la distance ;
 *   2. le tarif fixe de sa commune, sinon.
 *
 * Le repli par commune n'est pas un détail : beaucoup de clients refusent la
 * géolocalisation, et une commande ne doit jamais être bloquée pour ça.
 */
export function quoteDelivery(
  tariff: DeliveryTariff,
  point: { lat: number; lng: number } | null,
  communeFcfa: number | null
): DeliveryQuote {
  if (point && tariff.pickupLat !== null && tariff.pickupLng !== null) {
    const straight = haversineKm(tariff.pickupLat, tariff.pickupLng, point.lat, point.lng)
    const km = straight * tariff.roadFactor
    const raw = tariff.baseFcfa + km * tariff.perKmFcfa

    // Arrondi à la centaine supérieure : personne n'annonce « 1 743 FCFA ».
    const rounded = Math.ceil(raw / 100) * 100
    const clamped = Math.min(tariff.maxFcfa, Math.max(tariff.minFcfa, rounded))

    return {
      fcfa: clamped,
      km: Math.round(km * 10) / 10,
      method: 'distance',
      capped: rounded > tariff.maxFcfa,
    }
  }

  if (communeFcfa != null) {
    return { fcfa: communeFcfa, km: null, method: 'commune', capped: false }
  }

  return { fcfa: tariff.minFcfa, km: null, method: 'defaut', capped: false }
}

/** Lien de carte à transmettre au livreur. */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/**
 * Une position trop imprécise ne doit pas servir à facturer.
 *
 * Un téléphone avec le GPS actif donne 10 à 50 m. Un ordinateur qui se repère
 * au Wi-Fi ou à l'adresse IP peut se tromper de plusieurs kilomètres — soit
 * plusieurs communes d'écart à Abidjan, et un prix faux.
 */
export const MAX_ACCURACY_M = 2000

export function accuracyIsUsable(accuracyM: number | null | undefined): boolean {
  return accuracyM != null && accuracyM <= MAX_ACCURACY_M
}
