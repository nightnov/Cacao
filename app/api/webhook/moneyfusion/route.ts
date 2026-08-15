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
