import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

/**
 * Pourquoi le tableau de bord ne montre aucune commande.
 *
 * Deux causes donnent exactement le même écran vide, et rien à l'écran ne les
 * distingue : soit le paiement n'a rien enregistré, soit les commandes sont
 * bien là mais les règles d'accès de la base les cachent au compte connecté.
 * Une lecture refusée par ces règles ne renvoie aucune erreur, elle renvoie
 * zéro ligne — le tableau de bord affiche donc « aucune commande » avec la
 * même sérénité dans les deux cas.
 *
 * Cette route lit la base avec la clé de service, qui ignore les règles
 * d'accès. Si elle voit des commandes que le tableau de bord ne voit pas, la
 * cause est tranchée, et les deux identifiants à comparer sont sous les yeux.
 *
 * Accès : il faut être connecté. Le compte n'a en revanche pas besoin d'être
 * reconnu comme administrateur, sans quoi la route serait inutilisable dans
 * précisément la situation qu'elle sert à diagnostiquer. Un compte qui n'est
 * pas l'administrateur ne reçoit que les deux identifiants, jamais les
 * commandes.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) {
    return NextResponse.json({ error: 'Connectez vous d abord.' }, { status: 401 })
  }

  const asUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  )

  const { data: userData } = await asUser.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Session expirée. Reconnectez vous.' }, { status: 401 })
  }

  const identite = {
    votreCompte: user.id,
    identifiantAttenduParLesRegles: ADMIN_UUID,
    lesDeuxCorrespondent: user.id === ADMIN_UUID,
  }

  if (!identite.lesDeuxCorrespondent) {
    return NextResponse.json({
      ...identite,
      diagnostic:
        'Votre compte n est pas celui inscrit dans les regles de la base. Toutes les lectures et ' +
        'ecritures d administration sont refusees en silence. Transmettez la valeur de votreCompte.',
    })
  }

  // Même lecture, deux fois : une fois sous les droits du compte connecté, une
  // fois avec la clé de service. L'écart entre les deux est le diagnostic.
  const { count: vuParVous } = await asUser
    .from('orders')
    .select('id', { count: 'exact', head: true })

  const { count: reellementEnBase } = await getSupabaseAdmin()
    .from('orders')
    .select('id', { count: 'exact', head: true })

  // La liste des commandes ne lit pas que `id` : elle demande aussi les
  // colonnes ajoutées par les migrations récentes. Si l'une d'elles manque, la
  // base rejette la requête entière — pas seulement la colonne absente — et la
  // liste se retrouve vide alors que les commandes sont parfaitement lisibles.
  // On interroge donc chaque colonne suspecte séparément.
  const colonnes = [
    'delivery_code',
    'delivered_at',
    'is_custom_order',
    'estimated_total_fcfa',
    'quoted_price_fcfa',
    'customer_request',
    'internal_note',
    'shipping_address',
    'notes',
    'payment_method',
  ]

  const sonder = async (table: string, noms: string[]) => {
    const absentes: string[] = []
    for (const nom of noms) {
      const { error } = await asUser.from(table).select(nom).limit(1)
      if (error) absentes.push(`${nom} → ${error.message}`)
    }
    return absentes
  }

  const colonnesManquantes = await sonder('orders', colonnes)

  // Même examen pour les produits. Enregistrer une modification et supprimer un
  // produit échouent toujours, et une colonne absente dans ce que le formulaire
  // écrit produit exactement le même silence : la base refuse l'écriture
  // entière, pas seulement le champ inconnu.
  const colonnesProduitsManquantes = await sonder('products', [
    'short_description',
    'parcel_size',
    'components',
    'weight_kg',
    'item_condition',
    'included_items',
    'price_is_estimate',
    'supplier_name',
    'supplier_url',
    'supplier_product_id',
    'supplier_cost_fcfa',
    'status',
    'variant_options',
    'compare_at_price_fcfa',
    'video_url',
    'specs',
    'tags',
  ])

  /**
   * Test d'écriture sur les produits.
   *
   * Lire et écrire sont deux permissions distinctes : les produits se lisent
   * grâce à une règle de lecture publique, ce qui ne dit rien du droit de les
   * modifier. Et une écriture refusée ne renvoie aucune erreur — elle touche
   * zéro ligne en silence, si bien que le formulaire annonçait « enregistré »
   * sans que rien n'ait changé.
   *
   * On réécrit donc un produit avec sa propre valeur. Rien ne change dans la
   * base, mais la règle d'écriture est bel et bien sollicitée, et le nombre de
   * lignes touchées répond à la question.
   */
  let ecritureProduits = 'non testee'
  const { data: cible } = await asUser.from('products').select('id, name').limit(1)
  if (!cible?.length) {
    ecritureProduits = 'aucun produit en base pour tester'
  } else {
    const { data: touchees, error: erreurEcriture } = await asUser
      .from('products')
      .update({ name: cible[0].name })
      .eq('id', cible[0].id)
      .select('id')

    ecritureProduits = erreurEcriture
      ? `refusee avec erreur → ${erreurEcriture.message}`
      : touchees?.length
        ? 'ok'
        : 'REFUSEE EN SILENCE : zero ligne modifiee, aucune erreur. La regle ' +
          'd ecriture sur products est absente ou ne reconnait pas votre compte.'
  }

  /**
   * L'état réel des dernières commandes, et ce que le paiement en a dit.
   *
   * Le message WhatsApp se construit à partir du dernier paiement enregistré.
   * S'il annonce encore un impayé pour une commande réglée, ce n'est pas le
   * texte qui se trompe : c'est que la base n'a jamais appris que le paiement
   * avait abouti. MoneyFusion prévient le site par une notification, et si
   * cette notification n'arrive pas, la commande reste en attente pour
   * l'éternité alors que l'argent est bien arrivé.
   *
   * On lit donc côté service, sans filtre, ce que la base sait vraiment.
   */
  const db = getSupabaseAdmin()

  /**
   * Les rayons déclarés, et la valeur réellement écrite sur chaque produit.
   *
   * La page d'un rayon filtre en base sur cette valeur, tandis que le bas de
   * page regroupe les mêmes produits côté navigateur. Les deux affichaient des
   * comptes différents pour « PC Bureau », ce qui n'est possible que si la
   * valeur demandée par le lien et celle inscrite sur les produits ne se
   * correspondent pas exactement. Un espace en trop ou une majuscule suffit,
   * et rien à l'écran ne le laisse voir.
   */
  const { data: rayons } = await db.from('categories').select('value, label, sort_order')
  const { data: tousProduits } = await db.from('products').select('name, category, status')

  const parRayon = new Map<string, number>()
  for (const p of tousProduits || []) {
    const cle = JSON.stringify(p.category)
    parRayon.set(cle, (parRayon.get(cle) || 0) + 1)
  }

  const rayonsDeclares = (rayons || []).map(r => JSON.stringify(r.value))

  const catalogue = {
    rayonsDeclares,
    valeursEcritesSurLesProduits: Object.fromEntries(parRayon),
    // Une valeur portée par des produits mais absente des rayons déclarés
    // rend ces produits introuvables par le menu.
    valeursOrphelines: [...parRayon.keys()].filter(v => !rayonsDeclares.includes(v)),
    produits: (tousProduits || []).map(p => `${p.name} → ${JSON.stringify(p.category)} (${p.status})`),
  }
  const { data: dernieres } = await db
    .from('orders')
    .select('id, order_number, status, total_fcfa, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  const { data: journaux } = await db
    .from('payment_logs')
    .select('order_id, status, created_at')
    .order('created_at', { ascending: false })

  const dernierPaiement = new Map<string, string>()
  for (const j of journaux || []) {
    if (!dernierPaiement.has(j.order_id)) dernierPaiement.set(j.order_id, j.status)
  }

  const etatDesCommandes = (dernieres || []).map(o => ({
    commande: o.order_number,
    statut: o.status,
    montant: o.total_fcfa,
    dernierPaiementConnu: dernierPaiement.get(o.id) || 'AUCUNE NOTIFICATION RECUE',
    le: String(o.created_at).slice(0, 16),
  }))

  const notificationsRecues = (journaux || []).length

  // La jointure vers profiles est le second suspect : la liste la demande, et
  // un refus de lecture sur profiles ferait échouer la requête des commandes.
  const { error: erreurJointure } = await asUser
    .from('orders')
    .select('id, profiles(email, first_name, last_name)')
    .limit(1)

  return NextResponse.json({
    // Repère de version. Sans lui, une page servie depuis le cache ressemble
    // trait pour trait à une page à jour, et on cherche dans un resultat
    // périmé une ligne qui n'y a jamais été.
    version: 5,
    catalogue,
    notificationsDePaiementRecues: notificationsRecues,
    etatDesCommandes,
    ...identite,
    commandesVuesParVotreCompte: vuParVous ?? 0,
    commandesReellementEnBase: reellementEnBase ?? 0,
    colonnesManquantes: colonnesManquantes.length ? colonnesManquantes : 'aucune',
    colonnesProduitsManquantes: colonnesProduitsManquantes.length
      ? colonnesProduitsManquantes
      : 'aucune',
    ecritureProduits,
    jointureProfiles: erreurJointure ? erreurJointure.message : 'ok',
    diagnostic:
      reellementEnBase === 0
        ? 'La base ne contient aucune commande : le paiement n a rien enregistre.'
        : vuParVous !== reellementEnBase
          ? 'Les commandes existent mais les regles de la base les cachent a votre compte.'
          : colonnesManquantes.length
            ? 'Les commandes sont lisibles, mais des colonnes demandees par la liste manquent en ' +
              'base. La base rejette alors la requete entiere et la liste parait vide. ' +
              'Les migrations correspondantes ne sont pas appliquees.'
            : erreurJointure
              ? 'Les commandes sont lisibles, mais la jointure vers profiles echoue et fait ' +
                'echouer la requete de la liste.'
              : ecritureProduits !== 'ok'
                ? 'Les lectures repondent toutes. C est l ecriture sur les produits qui est ' +
                  'refusee : voir la ligne ecritureProduits.'
                : 'Tout ce qui est teste ici repond correctement, lectures comme ecritures.',
  })
}
