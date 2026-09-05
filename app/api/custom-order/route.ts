import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Enregistrement d'une commande sur mesure.
 *
 * Le client choisit sa configuration et valide. Aucun paiement n'est proposé :
 * le montant définitif n'est connu qu'après vérification, et encaisser avant
 * obligerait à rembourser à la main quand la machine n'est pas disponible.
 *
 * C'est une commande ordinaire, dans un état où le montant n'est pas encore
 * arrêté — et non une « demande ». Le client reçoit un numéro de commande tout
 * de suite et la retrouve dans son compte.
 *
 * Le prix affiché sur la fiche est conservé dans `estimated_total_fcfa`, pour
 * savoir plus tard sur quelle base il s'est décidé quand le montant confirmé
 * s'en écarte.
 */

function generateOrderNumber(): string {
  const d = new Date()
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CMD-${datePart}-${randomPart}`
}

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const productId = typeof body.product_id === 'string' ? body.product_id : ''
  const name = String(body.contact_name || '').trim()
  const phone = String(body.contact_phone || '').trim()
  const city = String(body.city || '').trim()
  const address = String(body.address || '').trim()
  const message = String(body.message || '').trim()
  const userId = typeof body.user_id === 'string' ? body.user_id : null
  const optionValueIds: string[] = Array.isArray(body.option_value_ids)
    ? body.option_value_ids.filter((v: unknown) => typeof v === 'string')
    : []

  if (!productId) {
    return Response.json({ error: 'Produit manquant.' }, { status: 400 })
  }
  // Le téléphone est le seul moyen de rappeler ce client : aucun envoi
  // d'e-mail ni de SMS n'existe dans le projet, et une commande sur mesure
  // impose de le recontacter pour lui donner le montant.
  if (!name || !phone) {
    return Response.json(
      { error: 'Votre nom et votre téléphone sont nécessaires pour vous confirmer le montant.' },
      { status: 400 }
    )
  }

  /**
   * Un compte est indispensable, et pas seulement par commodité technique :
   * c'est dans son espace client que le client verra le montant confirmé et
   * qu'il pourra régler. Sans compte, il ne reverrait jamais sa commande.
   */
  if (!userId) {
    return Response.json(
      { error: 'Connectez-vous pour commander : c\'est dans votre compte que le montant vous sera confirmé.' },
      { status: 401 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Le produit et son prix indicatif sont relus en base : ce que le navigateur
  // annonce ne sert qu'à l'affichage.
  const { data: product } = await supabase
    .from('products')
    .select('id, name, price_fcfa, availability, status')
    .eq('id', productId)
    .maybeSingle()

  if (!product || product.status === 'draft') {
    return Response.json({ error: 'Ce produit n\'est plus disponible.' }, { status: 404 })
  }

  // Le supplément de chaque valeur est relu lui aussi, pour que l'estimation
  // conservée soit celle du catalogue et non celle affichée par le navigateur.
  let extra = 0
  const labels: string[] = []
  if (optionValueIds.length) {
    const { data: values } = await supabase
      .from('product_option_values')
      .select('id, label, price_delta_fcfa')
      .in('id', optionValueIds)

    // Une valeur inconnue signale une configuration qui n'existe pas : mieux
    // vaut refuser que d'enregistrer une commande impossible à honorer.
    if (!values || values.length !== optionValueIds.length) {
      return Response.json({ error: 'Configuration invalide.' }, { status: 400 })
    }
    for (const v of values) {
      extra += Number(v.price_delta_fcfa) || 0
      labels.push(v.label)
    }
  }

  const estimated = Math.max(0, (product.price_fcfa || 0) + extra)
  const orderNumber = generateOrderNumber()

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'awaiting_quote',
      is_custom_order: true,
      // Les montants restent à zéro : rien n'est dû tant que rien n'est
      // confirmé, et un total pré-rempli laisserait croire le contraire dans
      // les statistiques.
      total_products_fcfa: 0,
      shipping_cost_fcfa: 0,
      total_fcfa: 0,
      estimated_total_fcfa: estimated,
      customer_request: message || null,
      payment_method: 'pending',
      shipping_address: { full_name: name, phone, city, address },
    })
    .select('id, order_number')
    .maybeSingle()

  if (error || !order) {
    console.error('Commande sur mesure : enregistrement impossible.', error)
    return Response.json({ error: 'Enregistrement impossible pour le moment.' }, { status: 500 })
  }

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    // Le prix indicatif, pas un montant dû. Le total de la commande reste à
    // zéro tant qu'aucun montant n'est confirmé.
    unit_price_fcfa: estimated,
    subtotal_fcfa: estimated,
    variant_label: labels.join(' · ') || null,
    option_value_ids: optionValueIds.length ? optionValueIds : null,
  })

  if (itemError) {
    console.error('Commande sur mesure : ligne impossible.', itemError)
  }

  return Response.json({ ok: true, order_number: order.order_number })
}
