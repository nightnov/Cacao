import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

interface InitiateBody {
  orderId: string
  orderNumber: string
  totalFcfa: number
  items: { name: string; price_fcfa: number; quantity: number }[]
  phone: string
  fullName: string
}

export async function POST(request: Request) {
  try {
    const body: InitiateBody = await request.json()
    const { orderId, orderNumber, totalFcfa, items, phone, fullName } = body

    if (!orderId || !orderNumber || !totalFcfa || !items?.length || !phone || !fullName) {
      return Response.json({ error: 'Données de commande incomplètes' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const apiUrl = process.env.MONEYFUSION_API_URL

    if (!apiUrl || !siteUrl) {
      console.error('MONEYFUSION_API_URL ou NEXT_PUBLIC_SITE_URL manquant')
      return Response.json({ error: 'Configuration de paiement manquante' }, { status: 500 })
    }

    // FusionPay attend "article" comme un tableau contenant un seul objet
    // { nomProduit: prix, ... } regroupant tous les articles du panier.
    const articleObject: Record<string, number> = {}
    for (const item of items) {
      articleObject[item.name] = item.price_fcfa * item.quantity
    }

    const paymentData = {
      totalPrice: totalFcfa,
      article: [articleObject],
      numeroSend: phone,
      nomclient: fullName,
      personal_Info: [{ orderId, orderNumber }],
      return_url: `${siteUrl}/checkout/return?order=${orderNumber}`,
      webhook_url: `${siteUrl}/api/webhook/moneyfusion`
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    })

    const result = await response.json()

    if (!response.ok || !result.statut) {
      console.error('Erreur MoneyFusion:', result)
      return Response.json(
        { error: result.message || 'Le paiement n\'a pas pu être initié' },
        { status: 502 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin.from('payment_logs').insert([{
      order_id: orderId,
      moneyfusion_transaction_id: result.token,
      status: 'initiated',
      amount_fcfa: totalFcfa,
      payment_method: 'moneyfusion',
      response_data: result
    }])

    return Response.json({ url: result.url, token: result.token })
  } catch (error: any) {
    console.error('Erreur initiation paiement:', error)
    return Response.json({ error: 'Erreur serveur lors de l\'initiation du paiement' }, { status: 500 })
  }
}
