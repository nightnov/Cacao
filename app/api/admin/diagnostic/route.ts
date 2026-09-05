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

  return NextResponse.json({
    ...identite,
    commandesVuesParVotreCompte: vuParVous ?? 0,
    commandesReellementEnBase: reellementEnBase ?? 0,
    diagnostic:
      reellementEnBase === 0
        ? 'La base ne contient aucune commande : le paiement n a rien enregistre.'
        : vuParVous === reellementEnBase
          ? 'Les commandes sont lisibles. Le probleme est ailleurs que dans les droits.'
          : 'Les commandes existent mais les regles de la base les cachent a votre compte. ' +
            'La regle orders_admin_all est absente ou incorrecte : appliquez la migration 046.',
  })
}
