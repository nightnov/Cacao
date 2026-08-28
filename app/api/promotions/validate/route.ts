import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkPromotion } from '@/lib/pricing.server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Vérification d'un code de réduction avant le paiement.
 *
 * Cette route ne sert qu'à l'affichage : elle indique au client si son code
 * est valable et combien il économise. Elle ne fait foi sur rien. Le montant
 * réellement prélevé est recalculé indépendamment au moment du paiement, à
 * partir de la commande enregistrée. Truquer la réponse de cette route ne
 * change donc pas ce que le client paie.
 *
 * Le panier envoyé ici n'est pas non plus digne de confiance : les prix sont
 * relus en base pour vérifier la condition de montant minimum.
 */
interface Body {
  code: string
  items: { product_id: string; variant_id?: string | null; quantity: number }[]
  city?: string | null
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Requête illisible.' }, { status: 400 })
  }

  if (!body.code?.trim()) {
    return NextResponse.json({ ok: false, reason: 'Saisissez un code.' }, { status: 400 })
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ ok: false, reason: 'Votre panier est vide.' }, { status: 400 })
  }

  // L'utilisateur, s'il est connecté : nécessaire pour « une seule fois par
  // client ». Un jeton absent ou invalide n'est pas une erreur, la promotion
  // est simplement évaluée sans cette restriction.
  let userId: string | null = null
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (token) {
    try {
      const authed = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
      )
      const { data } = await authed.auth.getUser()
      userId = data.user?.id || null
    } catch {
      userId = null
    }
  }

  const supabase = getSupabaseAdmin()

  const productIds = [...new Set(body.items.map(i => i.product_id).filter(Boolean))]
  const variantIds = [...new Set(body.items.map(i => i.variant_id).filter(Boolean))] as string[]

  const [productsRes, variantsRes, feeRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, price_fcfa').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    variantIds.length
      ? supabase.from('product_variants').select('id, price_fcfa').in('id', variantIds)
      : Promise.resolve({ data: [] as any[] }),
    body.city
      ? supabase.from('shipping_fees').select('fee_fcfa').eq('city', body.city).maybeSingle()
      : Promise.resolve({ data: null as any }),
  ])

  const productPrice = new Map((productsRes.data || []).map(p => [p.id, p.price_fcfa]))
  const variantPrice = new Map((variantsRes.data || []).map(v => [v.id, v.price_fcfa]))

  let productsTotal = 0
  for (const item of body.items) {
    const unit = item.variant_id
      ? variantPrice.get(item.variant_id)
      : productPrice.get(item.product_id)
    if (unit == null) continue
    productsTotal += unit * Math.max(1, Math.min(99, Number(item.quantity) || 1))
  }

  if (productsTotal <= 0) {
    return NextResponse.json({ ok: false, reason: 'Votre panier est vide.' }, { status: 400 })
  }

  const shipping = feeRes.data?.fee_fcfa ?? 0
  const result = await checkPromotion(body.code, productsTotal, shipping, userId)

  return NextResponse.json(result)
}
