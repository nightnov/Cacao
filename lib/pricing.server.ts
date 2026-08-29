import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  cartParcelSize,
  isParcelSize,
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
 * retenues sont `products` / `product_variants` pour les prix, `shipping_fees`
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
 * Les prix sont relus depuis `product_variants` quand la ligne porte une
 * variante, sinon depuis `products`. Le prix mémorisé dans `order_items` n'est
 * pas utilisé : il a été écrit par le navigateur, donc il n'est pas digne de
 * confiance à ce stade.
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
    .select('product_id, variant_id, quantity, product_name, variant_label')
    .eq('order_id', orderId)

  if (!items?.length) return null

  const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
  const variantIds = [...new Set(items.map(i => i.variant_id).filter(Boolean))]

  const [productsRes, variantsRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, price_fcfa, parcel_size').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    variantIds.length
      ? supabase.from('product_variants').select('id, price_fcfa').in('id', variantIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const productPrice = new Map((productsRes.data || []).map(p => [p.id, p.price_fcfa]))
  const productSize = new Map((productsRes.data || []).map(p => [p.id, p.parcel_size]))
  const variantPrice = new Map((variantsRes.data || []).map(v => [v.id, v.price_fcfa]))

  let productsTotal = 0
  const lines: PricedLine[] = []

  for (const item of items) {
    const unit = item.variant_id
      ? variantPrice.get(item.variant_id)
      : productPrice.get(item.product_id)

    // Un article dont le prix a disparu (produit supprimé entre-temps) ne peut
    // pas être facturé à zéro sans qu'on s'en aperçoive.
    if (unit == null) return null

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
  const [zoneRes, settingsRes] = await Promise.all([
    city
      ? supabase.from('shipping_fees').select('id, price_fcfa').eq('city', city).maybeSingle()
      : Promise.resolve({ data: null as any }),
    supabase.from('site_settings').select('key, value').in('key', ['default_parcel_size']),
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
  } else if (zoneRes.data?.id) {
    const { data: rates } = await supabase
      .from('shipping_rates')
      .select('parcel_size, price_fcfa')
      .eq('zone_id', zoneRes.data.id)

    const zoneRates: ZoneRates = {}
    for (const r of rates || []) {
      if (isParcelSize(r.parcel_size)) zoneRates[r.parcel_size] = r.price_fcfa
    }

    // Aucun tarif pour cette taille : on retombe sur le prix fixe historique
    // de la zone plutôt que de livrer gratuitement sans s'en apercevoir.
    shipping = zoneRates[parcelSize] ?? zoneRes.data.price_fcfa ?? 0
  } else {
    shipping = 0
  }

  let discount = 0
  if (order.promo_code) {
    const check = await checkPromotion(order.promo_code, productsTotal, shipping, order.user_id)
    if (check.ok) discount = check.discount || 0
  }

  const total = Math.max(0, productsTotal + shipping - discount)

  return {
    lines,
    productsTotal,
    shipping,
    parcelSize,
    deliveryMode: order.delivery_mode === 'retrait' ? 'retrait' : 'livraison',
    discount,
    promoCode: discount > 0 ? order.promo_code : null,
    total,
    mismatch: order.total_fcfa !== total ? { stored: order.total_fcfa, computed: total } : null,
  }
}
