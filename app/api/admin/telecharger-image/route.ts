import { createClient } from '@supabase/supabase-js'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

/**
 * Rapatrie une image distante pour le compte de l'administration.
 *
 * Deux raisons d'exister. Le navigateur ne peut pas lire les pixels d'une
 * image servie par un autre domaine : sans ce relais, une photo importée
 * depuis une place de marché ne peut être ni analysée ni recadrée. Et une
 * adresse pointant encore chez le vendeur est un lien qui casse le jour où il
 * retire son annonce — la photo doit devenir la nôtre.
 *
 * Mêmes gardes que la lecture d'annonce : accès réservé à l'administrateur,
 * et refus des adresses internes à l'hébergeur.
 */
async function isAdmin(request: Request): Promise<boolean> {
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return false

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  )

  const { data } = await supabase.auth.getUser()
  return data.user?.id === ADMIN_UUID
}

/**
 * Adresses que le serveur ne doit jamais aller lire pour le compte d'autrui :
 * boucle locale, réseaux privés, et l'adresse de métadonnées des hébergeurs
 * (169.254.169.254), qui délivre des identifiants d'accès.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return true
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd')) return true

  const parts = host.split('.')
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p))) return false
  const [a, b] = parts.map(Number)
  if (a === 127 || a === 0 || a === 10) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

/** Au delà, ce n'est plus une photo de produit. */
const POIDS_MAX = 15 * 1024 * 1024

export async function POST(request: Request) {
  try {
    if (!(await isAdmin(request))) {
      return Response.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Adresse manquante' }, { status: 400 })
    }

    let parsee: URL
    try {
      parsee = new URL(url)
    } catch {
      return Response.json({ error: 'Adresse invalide' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsee.protocol) || isPrivateHost(parsee.hostname)) {
      return Response.json({ error: 'Adresse refusée' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      return Response.json({ error: `Image inaccessible (erreur ${res.status})` }, { status: 422 })
    }

    // Le type est vérifié avant de lire le corps : une page HTML renvoyée à la
    // place d'une image produirait un fichier illisible, découvert bien plus
    // tard, au moment de l'afficher sur la boutique.
    const type = res.headers.get('content-type') || ''
    if (!type.startsWith('image/')) {
      return Response.json({ error: "Cette adresse ne renvoie pas une image." }, { status: 422 })
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > POIDS_MAX) {
      return Response.json({ error: 'Image trop lourde' }, { status: 413 })
    }

    return new Response(buffer, {
      headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return Response.json({ error: "L'image a mis trop de temps à venir." }, { status: 504 })
    }
    return Response.json({ error: "Impossible de récupérer cette image." }, { status: 500 })
  }
}
