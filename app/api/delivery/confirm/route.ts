import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Confirmation de remise par le livreur.
 *
 * Le livreur n'a pas de compte : il détient le lien du colis, et le client lui
 * dicte le code au moment de la remise. C'est la réunion des deux qui vaut
 * preuve — le lien seul ne suffit pas, le code seul non plus.
 *
 * La vérification est faite ici et pas dans le navigateur : sinon il suffirait
 * d'ouvrir les outils du navigateur pour lire le code attendu dans la page.
 */
const MAX_ATTEMPTS = 5

export async function POST(request: Request) {
  let body: { token?: unknown; code?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return Response.json({ error: 'Lien invalide.' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(code)) {
    return Response.json({ error: 'Le code comporte quatre chiffres.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, status, delivery_code, delivery_attempts, delivered_at')
    .eq('delivery_token', token)
    .maybeSingle()

  if (error || !order) {
    return Response.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  if (order.delivered_at) {
    return Response.json({ error: 'Cette livraison a déjà été confirmée.' }, { status: 409 })
  }

  if ((order.delivery_attempts ?? 0) >= MAX_ATTEMPTS) {
    return Response.json(
      { error: 'Trop de codes erronés. Contactez le vendeur pour confirmer la remise.' },
      { status: 429 }
    )
  }

  if (order.delivery_code !== code) {
    // Le compteur monte avant la réponse : sans cela, interrompre la requête
    // suffirait à essayer indéfiniment.
    await supabase
      .from('orders')
      .update({ delivery_attempts: (order.delivery_attempts ?? 0) + 1 })
      .eq('id', order.id)

    const left = MAX_ATTEMPTS - (order.delivery_attempts ?? 0) - 1
    return Response.json(
      {
        error: left > 0
          ? `Code incorrect. Il reste ${left} essai${left > 1 ? 's' : ''}.`
          : 'Code incorrect. Le lien est désormais bloqué, contactez le vendeur.'
      },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', order.id)

  if (updateError) {
    console.error('Livraison : confirmation impossible.', updateError)
    return Response.json({ error: 'Confirmation impossible pour le moment.' }, { status: 500 })
  }

  return Response.json({ ok: true, order_number: order.order_number })
}
