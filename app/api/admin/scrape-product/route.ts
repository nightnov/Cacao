import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

/**
 * Cette route fait lire au serveur une adresse fournie par l'appelant, et lui
 * renvoie ce qu'elle contient. Sans contrôle d'accès, n'importe qui sur
 * internet peut donc s'en servir comme relais : lancer des requêtes depuis
 * notre serveur, sous notre adresse, vers la cible de son choix. Le garde-fou
 * sur les adresses privées limite les dégâts, il ne remplace pas une porte
 * fermée.
 *
 * Le contrôle est le même que pour l'enregistrement des thèmes : le jeton du
 * navigateur est revalidé côté serveur, jamais cru sur parole.
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

interface ScrapedProduct {
  name?: string
  description?: string
  price_fcfa?: number
  price_currency?: string
  image_urls?: string[]
  supplier_name?: string
}

function hostToSupplierName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const known: Record<string, string> = {
      'jumia.ci': 'Jumia',
      'jumia.com': 'Jumia',
      'aliexpress.com': 'AliExpress',
      'amazon.com': 'Amazon',
      'amazon.fr': 'Amazon'
    }
    return known[host] || host.split('.')[0].replace(/^./, c => c.toUpperCase())
  } catch {
    return ''
  }
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

function parseJsonLdProduct($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const scripts = $('script[type="application/ld+json"]').toArray()
  for (const el of scripts) {
    try {
      const raw = $(el).contents().text()
      const json = JSON.parse(raw)
      const candidates = Array.isArray(json) ? json : [json, ...(json['@graph'] || [])]
      const product = candidates.find((n: any) => {
        const type = n?.['@type']
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'))
      })
      if (!product) continue

      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
      const images = Array.isArray(product.image) ? product.image : product.image ? [product.image] : []

      return {
        name: typeof product.name === 'string' ? product.name : undefined,
        description: typeof product.description === 'string' ? product.description : undefined,
        price_fcfa: offers?.price ? Number(offers.price) : undefined,
        price_currency: offers?.priceCurrency || undefined,
        image_urls: images.filter((i: unknown): i is string => typeof i === 'string')
      }
    } catch {
      // JSON-LD invalide, on continue avec le bloc suivant
    }
  }
  return {}
}

function parseOpenGraph($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const title = $('meta[property="og:title"]').attr('content')
  const description = $('meta[property="og:description"]').attr('content')
  const image = $('meta[property="og:image"]').attr('content')
  return {
    name: title || undefined,
    description: description || undefined,
    image_urls: image ? [image] : undefined
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin(request))) {
      return Response.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL manquante' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return Response.json({ error: 'URL invalide' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return Response.json({ error: 'URL invalide' }, { status: 400 })
    }

    // Cette route fait faire une requête au serveur vers une adresse fournie de
    // l'extérieur. Sans ce garde fou, on peut lui faire lire des adresses
    // internes à l'hébergeur — celle qui distribue les jetons d'accès, par
    // exemple — et en recevoir le contenu dans la réponse. On refuse donc tout
    // ce qui n'est pas une adresse publique.
    if (isPrivateHost(parsedUrl.hostname)) {
      return Response.json(
        { error: 'Cette adresse est interne au serveur et ne peut pas être lue.' },
        { status: 400 }
      )
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
      // Message distinct pour le refus : c'est le cas le plus fréquent en
      // ligne, et il ne se corrige pas en réessayant. Un site marchand laisse
      // souvent passer un ordinateur personnel et bloque les serveurs.
      const message =
        res.status === 403 || res.status === 401
          ? `${hostToSupplierName(url) || 'Ce site'} refuse la lecture depuis notre serveur (erreur ${res.status}). Copiez les informations à la main.`
          : `La page n'a pas pu être chargée (erreur ${res.status}).`
      return Response.json({ error: message }, { status: 422 })
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    const jsonLd = parseJsonLdProduct($)
    const og = parseOpenGraph($)

    const result: ScrapedProduct = {
      name: jsonLd.name || og.name,
      description: jsonLd.description || og.description,
      price_fcfa: jsonLd.price_currency && jsonLd.price_currency !== 'XOF' ? undefined : jsonLd.price_fcfa,
      price_currency: jsonLd.price_currency,
      image_urls: [...(jsonLd.image_urls || []), ...(og.image_urls || [])].filter(Boolean).slice(0, 8),
      supplier_name: hostToSupplierName(url)
    }

    if (!result.name && !result.image_urls?.length) {
      return Response.json(
        { error: "Aucune information exploitable n'a été trouvée sur cette page. Remplissez le formulaire manuellement." },
        { status: 422 }
      )
    }

    return Response.json(result)
  } catch (error: any) {
    console.error('Erreur scraping produit:', error)
    if (error?.name === 'TimeoutError') {
      return Response.json({ error: "Le site fournisseur a mis trop de temps à répondre." }, { status: 504 })
    }
    return Response.json({ error: "Impossible de récupérer les informations de cette URL." }, { status: 500 })
  }
}
