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

  const colonnesManquantes: string[] = []
  for (const colonne of colonnes) {
    const { error } = await asUser.from('orders').select(colonne).limit(1)
    if (error) colonnesManquantes.push(`${colonne} → ${error.message}`)
  }

  // La jointure vers profiles est le second suspect : la liste la demande, et
  // un refus de lecture sur profiles ferait échouer la requête des commandes.
  const { error: erreurJointure } = await asUser
    .from('orders')
    .select('id, profiles(email, first_name, last_name)')
    .limit(1)

  return NextResponse.json({
    ...identite,
    commandesVuesParVotreCompte: vuParVous ?? 0,
    commandesReellementEnBase: reellementEnBase ?? 0,
    colonnesManquantes: colonnesManquantes.length ? colonnesManquantes : 'aucune',
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
              : 'Tout ce qui est teste ici repond correctement. Ouvrez la page Commandes : elle ' +
                'affiche desormais le message exact renvoye par la base.',
  })
}
