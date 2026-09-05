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

    /**
     * Cette adresse est publique : n'importe qui peut lui envoyer un message.
     *
     * Sans vérification, il suffisait d'écrire « paiement abouti » pour cette
     * commande pour la faire passer en confirmée, déduire le stock et repartir
     * avec un ordinateur sans avoir rien payé. La commande n'a même pas besoin
     * d'être la sienne : son identifiant apparaît dans l'adresse de la page de
     * retour.
     *
     * On exige donc que le jeton annoncé soit un de ceux que nous avons
     * nous mêmes obtenus de MoneyFusion en ouvrant ce paiement, et qu'il
     * appartienne bien à cette commande. Un inconnu ne peut pas le deviner :
     * il est produit par MoneyFusion et n'a jamais circulé publiquement.
     *
     * Ce n'est pas une signature cryptographique et je ne le présente pas
     * comme telle. C'est ce qui est vérifiable sans documentation
     * supplémentaire, et cela ferme la porte grande ouverte.
     */
    if (payload.event === 'payin.session.completed') {
      const { data: connu } = await supabaseAdmin
        .from('payment_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('moneyfusion_transaction_id', payload.tokenPay)
        .limit(1)

      if (!connu?.length) {
        console.error(
          'Notification de paiement rejetée : jeton inconnu pour la commande',
          orderId,
          payload.tokenPay
        )
        // On répond 200 : rien ne sert d'apprendre à l'expéditeur si son essai
        // a porté, et une erreur ferait réessayer un émetteur légitime.
        return Response.json({ received: true })
      }
    }

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
