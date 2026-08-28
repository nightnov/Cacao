import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

interface WebhookPayload {
  event: 'payin.session.pending' | 'payin.session.completed' | 'payin.session.cancelled'
  personal_Info?: { orderId: string; orderNumber: string }[]
  tokenPay: string
  numeroSend: string
  nomclient: string
  numeroTransaction: string
  Montant: number
  frais: number
  createdAt: string
}

const eventToOrderStatus: Record<string, string> = {
  'payin.session.pending': 'pending',
  'payin.session.completed': 'confirmed',
  'payin.session.cancelled': 'cancelled'
}

const eventToPaymentLogStatus: Record<string, string> = {
  'payin.session.pending': 'initiated',
  'payin.session.completed': 'successful',
  'payin.session.cancelled': 'failed'
}

export async function POST(request: Request) {
  try {
    const payload: WebhookPayload = await request.json()
    const orderId = payload.personal_Info?.[0]?.orderId

    if (!orderId) {
      console.error('Webhook MoneyFusion sans orderId:', payload)
      return Response.json({ received: true })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Idempotence: on ignore si le statut n'a pas changé (Moneyfusion peut
    // renvoyer plusieurs fois le même événement).
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle()

    const newStatus = eventToOrderStatus[payload.event]
    if (newStatus && existingOrder && existingOrder.status !== newStatus) {
      await supabaseAdmin
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
    }

    // Déduction du stock à la confirmation du paiement.
    //
    // L'appel est volontairement fait à chaque notification « completed » et
    // non uniquement quand le statut change : si la mise à jour ci-dessus a
    // échoué au passage précédent, le stock serait sinon perdu pour toujours.
    // La fonction est idempotente — déduire deux fois la même commande est
    // sans effet — donc la répétition ne coûte rien.
    if (newStatus === 'confirmed') {
      const { error: stockError } = await supabaseAdmin.rpc('apply_order_stock', {
        p_order_id: orderId,
      })
      // Un échec ici ne doit pas empêcher l'enregistrement du paiement : la
      // commande est payée, c'est le fait le plus important à conserver.
      if (stockError) {
        console.error('Déduction du stock impossible pour la commande', orderId, stockError)
      }

      // Un code promo n'est décompté qu'ici, et non à la création de la
      // commande : un panier abandonné avant paiement ne doit pas consommer
      // une place sur un code à nombre d'utilisations limité.
      const { error: promoError } = await supabaseAdmin.rpc('apply_order_promotion', {
        p_order_id: orderId,
      })
      if (promoError) {
        console.error('Comptage du code promo impossible pour', orderId, promoError)
      }
    }

    await supabaseAdmin.from('payment_logs').insert([{
      order_id: orderId,
      moneyfusion_transaction_id: payload.tokenPay,
      status: eventToPaymentLogStatus[payload.event] || 'initiated',
      amount_fcfa: payload.Montant,
      payment_method: 'moneyfusion',
      response_data: payload
    }])

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('Erreur webhook MoneyFusion:', error)
    // On répond 200 quand même pour éviter que Moneyfusion ne renvoie en boucle
    // une notification malformée qu'on ne pourra jamais traiter.
    return Response.json({ received: true, error: 'processing_error' })
  }
}
