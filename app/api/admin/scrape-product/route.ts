import * as cheerio from 'cheerio'

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

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
      return Response.json({ error: `La page n'a pas pu être chargée (${res.status})` }, { status: 422 })
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
