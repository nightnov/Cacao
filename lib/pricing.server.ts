import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  cartParcelSize,
  isParcelSize,
  volumeDiscount,
  DEFAULT_PARCEL_SIZE,
  type ParcelSize,
  type ZoneRates,
} from '@/lib/delivery'

/**
 * Calcul du montant à payer, côté serveur, à partir des prix en base.
 *
 * Pourquoi ce fichier existe : le tunnel de commande construit le panier dans
 * le navigateur, insère la commande depuis le navigateur, puis transmettait son
 * propre total au prestataire de paiement. Rien ne le vérifiait. En modifiant
 * la requête, un visiteur pouvait payer 1 000 FCFA un ordinateur à 299 000.
 *
 * Tout ce qui vient du navigateur est donc ignoré ici. Les seules sources
 * retenues sont `products` et `product_option_values` pour les prix, `shipping_fees`
 * pour la livraison, et `promotions` pour la remise.
 */

export interface PricedLine {
  /** Libellé d'affichage. Vient de la commande : c'est du texte, pas un prix. */
  label: string
  quantity: number
  unit: number
  subtotal: number
}

export interface PricedOrder {
  lines: PricedLine[]
  productsTotal: number
  shipping: number
  /** Taille de colis retenue pour la livraison. */
  parcelSize: ParcelSize
  deliveryMode: 'livraison' | 'retrait'
  discount: number
  /** Origine de la remise retenue, quand il y en a une. */
  discountKind: 'promo' | 'volume' | null
  promoCode: string | null
  total: number
  /** Renseigné quand le total enregistré ne correspondait pas au calcul. */
  mismatch: { stored: number; computed: number } | null
}

export interface PromoCheck {
  ok: boolean
  reason?: string
  code?: string
  promotionId?: string
  discount?: number
  freeShipping?: boolean
}

/**
 * Vérifie un code et calcule la remise qu'il donne.
 *
 * `productsTotal` doit être le total recalculé, jamais celui du navigateur :
 * sinon un panier annoncé très élevé débloquerait une remise à laquelle il n'a
 * pas droit.
 */
export async function checkPromotion(
  rawCode: string,
  productsTotal: number,
  shipping: number,
  userId: string | null
): Promise<PromoCheck> {
  const code = (rawCode || '').trim().toUpperCase()
  if (!code) return { ok: false, reason: 'Aucun code fourni.' }

  const supabase = getSupabaseAdmin()
  const { data: promo } = await supabase
    .from('promotions')
    .select('*')
    .ilike('code', code)
    .maybeSingle()

  if (!promo) return { ok: false, reason: "Ce code n'existe pas." }
  if (!promo.is_active) return { ok: false, reason: "Ce code n'est plus actif." }

  const today = new Date().toISOString().slice(0, 10)
  if (promo.starts_on && today < promo.starts_on) {
    return { ok: false, reason: "Ce code n'est pas encore valable." }
  }
  if (promo.ends_on && today > promo.ends_on) {
    return { ok: false, reason: 'Ce code a expiré.' }
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { ok: false, reason: 'Ce code a atteint son nombre maximum d’utilisations.' }
  }
  if (productsTotal < promo.min_order_fcfa) {
    return {
      ok: false,
      reason: `Ce code demande un panier d’au moins ${promo.min_order_fcfa.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA.`,
    }
  }

  if (promo.once_per_customer && userId) {
    const { count } = await supabase
      .from('promotion_uses')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promo.id)
      .eq('user_id', userId)
    if ((count || 0) > 0) {
      return { ok: false, reason: 'Vous avez déjà utilisé ce code.' }
    }
  }

  let discount = 0
  let freeShipping = false

  if (promo.kind === 'percent') {
    discount = Math.round((productsTotal * promo.value) / 100)
  } else if (promo.kind === 'amount') {
    discount = promo.value
  } else if (promo.kind === 'free_shipping') {
    discount = shipping
    freeShipping = true
  }

  // La remise ne peut pas dépasser ce qu'il y a à payer : un code de
  // −15 000 FCFA sur un panier de 10 000 donnerait sinon un total négatif,
  // que le prestataire de paiement refuserait.
  discount = Math.max(0, Math.min(discount, productsTotal + shipping))

  return { ok: true, code, promotionId: promo.id, discount, freeShipping }
}

/**
 * Recalcule intégralement une commande à partir de la base.
 *
 * Rien de ce qui vient du navigateur n'est utilisé pour calculer le montant.
 * Le prix de base est relu depuis `products` — ou `product_variants` pour les
 * lignes issues de l'ancien modèle — et les suppléments de configuration sont
 * retrouvés en base à partir des seuls identifiants de valeurs conservés.
 * Le champ `unit_price_fcfa` de `order_items` est délibérément ignoré : il a
 * été écrit côté client, donc il n'est pas digne de confiance à ce stade.
 */
export async function priceOrder(orderId: string): Promise<PricedOrder | null> {
  const supabase = getSupabaseAdmin()

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, total_fcfa, shipping_address, promo_code, delivery_mode')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity, product_name, variant_label, option_value_ids')
    .eq('order_id', orderId)

  if (!items?.length) return null

  const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
  const variantIds = [...new Set(items.map(i => i.variant_id).filter(Boolean))]

  // Identifiants de configuration retenus sur l'ensemble des lignes.
  const optionValueIds = [
    ...new Set(items.flatMap(i => (i.option_value_ids as string[] | null) || [])),
  ].filter(Boolean)

  const [productsRes, variantsRes, optionValuesRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, price_fcfa, parcel_size').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    variantIds.length
      ? supabase.from('product_variants').select('id, price_fcfa').in('id', variantIds)
      : Promise.resolve({ data: [] as any[] }),
    /**
     * Suppléments de configuration, relus en base.
     *
     * C'est le point sensible de cette fonction. Le navigateur affiche un prix
     * qui tient compte des options choisies ; s'il était cru sur parole, il
     * suffirait de demander un Core i7 et 2 To en ne payant que le prix de
     * base. On ne garde donc du panier que les IDENTIFIANTS des valeurs, et le
     * montant qu'ils représentent est retrouvé ici.
     */
    optionValueIds.length
      ? supabase
          .from('product_option_values')
          .select('id, price_delta_fcfa')
          .in('id', optionValueIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const productPrice = new Map((productsRes.data || []).map(p => [p.id, p.price_fcfa]))
  const productSize = new Map((productsRes.data || []).map(p => [p.id, p.parcel_size]))
  const variantPrice = new Map((variantsRes.data || []).map(v => [v.id, v.price_fcfa]))
  const optionDelta = new Map(
    (optionValuesRes.data || []).map((v: any) => [v.id, Number(v.price_delta_fcfa) || 0])
  )

  let productsTotal = 0
  const lines: PricedLine[] = []

  for (const item of items) {
    const base = item.variant_id
      ? variantPrice.get(item.variant_id)
      : productPrice.get(item.product_id)

    // Un article dont le prix a disparu (produit supprimé entre-temps) ne peut
    // pas être facturé à zéro sans qu'on s'en aperçoive.
    if (base == null) return null

    // Une valeur d'option introuvable — supprimée depuis la commande — ne doit
    // pas être silencieusement comptée pour zéro : le total facturé serait
    // inférieur à celui affiché au client, sans que rien ne le signale.
    const chosen = (item.option_value_ids as string[] | null) || []
    let extra = 0
    for (const id of chosen) {
      const delta = optionDelta.get(id)
      if (delta == null) return null
      extra += delta
    }

    // Un cumul de réductions ne peut pas rendre un article gratuit ou négatif.
    const unit = Math.max(0, base + extra)

    const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1))
    const subtotal = unit * qty
    productsTotal += subtotal

    lines.push({
      label: item.variant_label
        ? `${item.product_name} (${item.variant_label})`
        : item.product_name,
      quantity: qty,
      unit,
      subtotal,
    })
  }

  // Frais de livraison entièrement recalculés : ni la taille de colis ni le
  // prix annoncés par le navigateur ne sont repris. La zone vient de la
  // commande, la taille des produits en base, et le prix de la grille.
  const city = (order.shipping_address as any)?.city
  const [localityRes, settingsRes] = await Promise.all([
    city
      ? supabase
          .from('shipping_fees')
          .select('id, price_fcfa, zone_number')
          .eq('city', city)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'default_parcel_size',
        'pickup_zone',
        'volume_discount_enabled',
        'volume_discount_threshold_fcfa',
        'volume_discount_percent',
      ]),
  ])

  const settings = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value]))
  const defaultSize = isParcelSize(settings.default_parcel_size)
    ? settings.default_parcel_size
    : DEFAULT_PARCEL_SIZE

  const parcelSize = cartParcelSize(
    items.map(i => ({ parcel_size: productSize.get(i.product_id) })),
    defaultSize
  )

  let shipping = 0

  if (order.delivery_mode === 'retrait') {
    // Le client vient chercher : rien à transporter, rien à facturer.
    shipping = 0
  } else if (localityRes.data) {
    const fromZone = Number(settings.pickup_zone) || 1
    const toZone = localityRes.data.zone_number

    if (toZone) {
      // Le trajet est cherché dans les deux sens : la grille relevée ne
      // publie qu'une moitié du tableau (zone basse vers zone haute), le
      // tarif étant le même à l'aller et au retour.
      const { data: rate } = await supabase
        .from('shipping_rates')
        .select('price_fcfa')
        .or(
          `and(from_zone.eq.${fromZone},to_zone.eq.${toZone}),and(from_zone.eq.${toZone},to_zone.eq.${fromZone})`
        )
        .eq('parcel_size', parcelSize)
        .limit(1)
        .maybeSingle()

      shipping = rate?.price_fcfa ?? localityRes.data.price_fcfa ?? 0
    } else {
      // Localité sans zone : on garde son prix fixe plutôt que de livrer
      // gratuitement sans s'en apercevoir.
      shipping = localityRes.data.price_fcfa ?? 0
    }
  } else {
    shipping = 0
  }

  let promoDiscount = 0
  if (order.promo_code) {
    const check = await checkPromotion(order.promo_code, productsTotal, shipping, order.user_id)
    if (check.ok) promoDiscount = check.discount || 0
  }

  // Remise sur gros panier, accordée automatiquement dès le seuil franchi.
  const volume = volumeDiscount(
    {
      enabled: settings.volume_discount_enabled !== 'false',
      thresholdFcfa: Number(settings.volume_discount_threshold_fcfa),
      percent: Number(settings.volume_discount_percent),
    },
    productsTotal
  )

  // Les deux remises ne se cumulent pas : la plus avantageuse l'emporte. Les
  // additionner donnerait vite 20 % ou plus sur des montants à sept chiffres.
  const discount = Math.max(promoDiscount, volume)
  const discountKind: PricedOrder['discountKind'] =
    discount === 0 ? null : volume > promoDiscount ? 'volume' : 'promo'

  const total = Math.max(0, productsTotal + shipping - discount)

  return {
    lines,
    productsTotal,
    shipping,
    parcelSize,
    deliveryMode: order.delivery_mode === 'retrait' ? 'retrait' : 'livraison',
    discount,
    discountKind,
    promoCode: discountKind === 'promo' ? order.promo_code : null,
    total,
    mismatch: order.total_fcfa !== total ? { stored: order.total_fcfa, computed: total } : null,
  }
}
