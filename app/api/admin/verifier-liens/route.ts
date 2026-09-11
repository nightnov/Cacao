import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

/**
 * Nombre de constats « page introuvable » avant de conclure.
 *
 * La vérification tourne une fois par jour : trois constats valent donc trois
 * jours. Mesuré sur CoinAfrique, une annonce vivante renvoie une erreur
 * serveur quatre fois sur cinq — conclure au premier essai sortirait de la
 * vente des produits parfaitement disponibles.
 */
const SEUIL = 3

/**
 * Seuls ces codes signifient que l'annonce n'existe plus.
 *
 * 404 « rien à cette adresse », 410 « retiré définitivement ». Tout le reste —
 * lenteur, panne, refus d'accès, protection anti robot — parle de l'état du
 * site, pas de celui de l'annonce, et ne doit jamais faire bouger un produit.
 */
const CODES_RETRAIT = [404, 410]

interface Ligne {
  product_id: string
  source_url: string | null
  echecs_consecutifs: number | null
  annonce_retiree_le: string | null
  bascule_le: string | null
}

/** Le cron de Vercel, ou une session administrateur pour un lancement manuel. */
async function autorise(request: Request): Promise<boolean> {
  const entete = request.headers.get('authorization') || ''
  const jeton = entete.replace(/^Bearer /i, '')
  if (!jeton) return false

  const secret = process.env.CRON_SECRET
  if (secret && jeton === secret) return true

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } }
  )
  const { data } = await supabase.auth.getUser()
  return data.user?.id === ADMIN_UUID
}

/**
 * Interroge une adresse et renvoie son code.
 *
 * `HEAD` d'abord : il ne rapatrie pas la page, ce qui est plus rapide et moins
 * lourd pour le site visité. Beaucoup de serveurs le refusent pourtant avec un
 * 405 ; on repasse alors en `GET`. Sans ce repli, un site qui ignore `HEAD`
 * ferait croire à un problème sur toutes ses annonces à la fois.
 */
async function interroger(url: string): Promise<number> {
  const entetes = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  }
  try {
    const tete = await fetch(url, {
      method: 'HEAD',
      headers: entetes,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    if (tete.status !== 405 && tete.status !== 501) return tete.status

    const complet = await fetch(url, {
      headers: entetes,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
    return complet.status
  } catch {
    // Délai dépassé, nom de domaine introuvable, connexion refusée. On ne sait
    // pas ce qui se passe : ce n'est pas un retrait d'annonce.
    return 0
  }
}

export async function GET(request: Request) {
  if (!(await autorise(request))) {
    return Response.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  const { data: lignes, error } = await supabase
    .from('product_sourcing')
    .select('product_id, source_url, echecs_consecutifs, annonce_retiree_le, bascule_le')
    .not('source_url', 'is', null)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const aVerifier = (lignes || []) as Ligne[]
  const maintenant = new Date().toISOString()
  const rapport = { verifies: 0, vivants: 0, retires: 0, indecis: 0, bascules: [] as string[] }

  for (const ligne of aVerifier) {
    if (!ligne.source_url) continue
    rapport.verifies++

    const statut = await interroger(ligne.source_url)
    const retrait = CODES_RETRAIT.includes(statut)
    // Un code répondu hors liste de retrait prouve que la page existe encore.
    // Le zéro, lui, ne prouve rien : on laisse le compteur où il est plutôt
    // que de le remettre à neuf sur une absence d'information.
    const vivant = statut >= 200 && statut < 400

    let echecs = ligne.echecs_consecutifs || 0
    if (retrait) echecs++
    else if (vivant) echecs = 0

    if (retrait) rapport.retires++
    else if (vivant) rapport.vivants++
    else rapport.indecis++

    const retireeLe = echecs >= SEUIL ? ligne.annonce_retiree_le || maintenant : null

    const maj: Record<string, unknown> = {
      verifie_le: maintenant,
      dernier_statut: statut,
      echecs_consecutifs: echecs,
      annonce_retiree_le: retireeLe,
    }

    /**
     * La bascule en « sur commande ».
     *
     * Elle n'a lieu qu'une fois par lien mort, et seulement sur un produit
     * annoncé en stock. `bascule_le` empêche de recommencer : sans lui, un
     * produit que vous auriez remis en stock après avoir trouvé une autre
     * source repartirait en « sur commande » dès le lendemain, contre votre
     * décision.
     *
     * Rien n'est jamais retiré de la vente automatiquement. « Sur commande »
     * dit au client que le délai est à confirmer, ce qui est exact, et vous
     * laisse le temps de coller un autre lien.
     */
    if (echecs >= SEUIL && !ligne.bascule_le) {
      const { data: bascules } = await supabase
        .from('products')
        .update({ availability: 'on_order' })
        .eq('id', ligne.product_id)
        .eq('availability', 'in_stock')
        .select('id, name')

      if (bascules?.length) {
        maj.bascule_le = maintenant
        rapport.bascules.push(bascules[0].name as string)
      }
    }

    await supabase.from('product_sourcing').update(maj).eq('product_id', ligne.product_id)
  }

  return Response.json(rapport)
}
