import { createClient } from '@supabase/supabase-js'
import { fetchCatalog } from '@/lib/catalog.server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/**
 * La lecture elle même vit dans `lib/catalog.server.ts`, partagée avec la page
 * d'accueil qui l'appelle directement au lieu de passer par le réseau.
 * Cette route reste pour les écrans qui filtrent en direct : catalogue,
 * recherche.
 */
/**
 * Toujours dynamique : la route lit des paramètres d'URL. Sans cette ligne,
 * la compilation tente de la figer, échoue, et consigne une erreur qui n'en
 * est pas une.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const products = await fetchCatalog({
      category: searchParams.get('category'),
      search,
      sort: searchParams.get('sort'),
    })

    // Journalisation des recherches : propre à cette route, puisqu'elle seule
    // reçoit une intention de recherche formulée par un visiteur.
    if (search) {
      await supabase.from('search_logs').insert([{ query: search, results_count: products.length }])
    }

    return Response.json(products)
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
