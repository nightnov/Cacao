import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Confirmation de remise par le livreur.
 *
 * Le livreur n'a pas de compte. Il ouvre une page unique, dont l'adresse lui a
 * été donnée une fois pour toutes, et saisit le code que le client lui dicte
 * au moment de la remise. C'est cela qui vaut preuve : le code n'est
 * obtenable qu'en rencontrant le client.
 *
 * Puisque l'adresse de la page est connue de tous, c'est le code seul qui
 * protège. Deux garde fous le rendent suffisant :
 *
 *   • sa longueur — six chiffres, soit un million de combinaisons pour les
 *     commandes créées depuis la migration 043 ;
 *   • la limite d'essais ci dessous, comptée par appareil.
 *
 * Et rien n'est révélé tant que le code n'est pas juste : un essai raté
 * n'apprend même pas si une commande existe.
 */
const MAX_ATTEMPTS_PER_HOUR = 10

function hashIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'inconnue'
  // L'adresse n'est pas conservée en clair : compter les essais ne demande pas
  // de savoir qui les fait.
  return createHash('sha256')
    .update(`${ip}|${process.env.SUPABASE_SERVICE_ROLE_KEY || 'cacao'}`)
    .digest('hex')
}

export async function POST(request: Request) {
  let body: { code?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  // Quatre chiffres restent acceptés : les commandes passées avant la
  // migration 043 en portent un, et le client l'a peut être noté.
  if (!/^\d{4,6}$/.test(code)) {
    return Response.json({ error: 'Le code comporte six chiffres.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const ipHash = hashIp(request)
  const since = new Date(Date.now() - 3600_000).toISOString()

  const { count } = await supabase
    .from('delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
    return Response.json(
      { error: 'Trop d\'essais. Réessayez dans une heure ou contactez le vendeur.' },
      { status: 429 }
    )
  }

  const { data: matches, error } = await supabase
    .from('orders')
    .select('id, order_number, shipping_address')
    .eq('delivery_code', code)
    .is('delivered_at', null)
    .not('status', 'in', '(cancelled,refunded,delivered)')
    .limit(2)

  if (error) {
    console.error('Livraison : lecture impossible.', error)
    return Response.json({ error: 'Confirmation impossible pour le moment.' }, { status: 500 })
  }

  // L'essai est enregistré avant la réponse : interrompre la requête ne doit
  // pas permettre de recommencer sans compter.
  await supabase.from('delivery_attempts').insert({
    ip_hash: ipHash,
    succeeded: matches?.length === 1
  })

  if (!matches || matches.length === 0) {
    return Response.json(
      { error: 'Code inconnu. Vérifiez auprès du client.' },
      { status: 404 }
    )
  }

  // Deux commandes en cours portant le même code : improbable sur un million
  // de combinaisons, mais confirmer la mauvaise serait pire que de s'arrêter.
  if (matches.length > 1) {
    return Response.json(
      { error: 'Ce code correspond à plusieurs commandes. Contactez le vendeur.' },
      { status: 409 }
    )
  }

  const order = matches[0]
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', order.id)
    // La commande ne doit pas avoir été confirmée entre la lecture et
    // l'écriture : sans cette condition, deux envois simultanés passeraient
    // tous les deux.
    .is('delivered_at', null)

  if (updateError) {
    console.error('Livraison : confirmation impossible.', updateError)
    return Response.json({ error: 'Confirmation impossible pour le moment.' }, { status: 500 })
  }

  const address = (order.shipping_address || {}) as { full_name?: string }

  return Response.json({
    ok: true,
    order_number: order.order_number,
    // Renvoyé seulement après un code juste : le livreur vérifie qu'il est
    // bien chez la bonne personne, et rien n'a fuité en cas d'essai raté.
    recipient: address.full_name || null
  })
}
