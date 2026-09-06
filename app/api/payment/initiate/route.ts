import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { priceOrder } from '@/lib/pricing.server'

interface InitiateBody {
  orderId: string
  orderNumber: string
  items: { name: string; price_fcfa: number; quantity: number }[]
  phone: string
  fullName: string
}

export async function POST(request: Request) {
  try {
    const body: InitiateBody = await request.json()
    const { orderId, orderNumber, items, phone, fullName } = body

    if (!orderId || !orderNumber || !items?.length || !phone || !fullName) {
      return Response.json({ error: 'Données de commande incomplètes' }, { status: 400 })
    }

    /**
     * On ne lance un paiement que pour sa propre commande.
     *
     * La route n'exigeait rien : n'importe qui pouvait envoyer l'identifiant
     * d'une commande et obtenir un lien de paiement à son nom, avec le numéro
     * de téléphone de son choix. Personne n'y gagnait d'argent, mais cela
     * suffisait à savoir qu'une commande existe, à polluer le journal des
     * paiements, et à faire partir des demandes de paiement chez MoneyFusion
     * au nom de clients qui n'avaient rien demandé.
     */
    const jeton = request.headers.get('authorization')?.replace(/^Bearer /i, '')
    if (!jeton) {
      return Response.json({ error: 'Connectez vous pour payer.' }, { status: 401 })
    }

    const commeClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } }
    )

    const { data: session } = await commeClient.auth.getUser()
    if (!session.user) {
      return Response.json({ error: 'Session expirée. Reconnectez vous.' }, { status: 401 })
    }

    // La lecture passe par les droits du client : une commande qui ne lui
    // appartient pas ne lui est tout simplement pas retournée.
    const { data: sienne } = await commeClient
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle()

    if (!sienne) {
      return Response.json({ error: 'Commande introuvable.' }, { status: 404 })
    }

    // Le montant est recalculé à partir des prix en base et non repris de la
    // requête. Le tunnel de commande s'exécute dans le navigateur : son total
    // était modifiable, et permettait de payer un ordinateur au prix qu'on
    // voulait. Rien de ce que le client annonce sur les prix n'est retenu.
    const priced = await priceOrder(orderId)
    if (!priced) {
      return Response.json(
        { error: 'Commande introuvable ou article indisponible.' },
        { status: 400 }
      )
    }

    const totalFcfa = priced.total
    if (totalFcfa <= 0) {
      return Response.json({ error: 'Montant de commande invalide.' }, { status: 400 })
    }

    // Un écart signale soit un prix modifié entre la mise au panier et le
    // paiement, soit une tentative de manipulation. On aligne la commande sur
    // le montant réellement demandé au paiement, pour que la comptabilité et
    // le reçu du client correspondent à ce qui a été payé.
    const supabaseAdmin = getSupabaseAdmin()
    if (priced.mismatch) {
      console.warn(
        `Total recalculé pour la commande ${orderNumber} :`,
        `annoncé ${priced.mismatch.stored}, retenu ${priced.mismatch.computed}`
      )
      await supabaseAdmin
        .from('orders')
        .update({
          total_products_fcfa: priced.productsTotal,
          shipping_cost_fcfa: priced.shipping,
          discount_fcfa: priced.discount,
          total_fcfa: priced.total,
          // Taille retenue par le serveur, pas celle annoncée par le navigateur :
          // c'est elle qui explique le tarif appliqué.
          delivery_parcel_size: priced.parcelSize,
        })
        .eq('id', orderId)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const apiUrl = process.env.MONEYFUSION_API_URL

    if (!apiUrl || !siteUrl) {
      console.error('MONEYFUSION_API_URL ou NEXT_PUBLIC_SITE_URL manquant')
      return Response.json({ error: 'Configuration de paiement manquante' }, { status: 500 })
    }

    // FusionPay attend "article" comme un tableau contenant un seul objet
    // { nomProduit: prix, ... } regroupant tous les articles du panier.
    //
    // Le détail est construit à partir du même calcul serveur que le total,
    // sinon la somme des lignes affichées au client ne correspondrait pas au
    // montant prélevé — en particulier dès qu'une remise s'applique.
    const articleObject: Record<string, number> = {}
    for (const line of priced.lines) {
      // Deux articles peuvent porter le même libellé ; sans ce cumul, le second
      // écraserait le premier et le détail serait faux.
      articleObject[line.label] = (articleObject[line.label] || 0) + line.subtotal
    }
    if (priced.shipping > 0) {
      articleObject['Livraison'] = priced.shipping
    }
    if (priced.discount > 0) {
      articleObject[`Remise ${priced.promoCode || ''}`.trim()] = -priced.discount
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
