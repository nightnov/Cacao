import { createClient } from '@supabase/supabase-js'

/**
 * Lecture du catalogue, côté serveur.
 *
 * Ce code vivait uniquement dans la route `/api/products`, appelée depuis le
 * navigateur. La page d'accueil affichait donc d'abord des cadres gris, puis se
 * réorganisait quand les produits arrivaient. Extrait ici, il sert aux deux :
 * la route pour les écrans qui filtrent en direct, la page d'accueil pour un
 * affichage déjà complet au premier rendu.
 *
 * Une seule définition évite que les deux chemins divergent — même tri, mêmes
 * notes, mêmes couleurs.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export interface CatalogProduct {
  id: string
  name: string
  slug: string
  description?: string | null
  category: string
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs?: Record<string, unknown>
  tags?: string[] | null
  image_urls: string[]
  video_url?: string | null
  created_at?: string
  avg_rating?: number | null
  review_count?: number
  view_count?: number
  colors?: { value: string; image_url: string | null }[]
}

const COLUMNS =
  'id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, created_at'

/** Nom d'option à retenir pour les pastilles de couleur, accents et casse ignorés. */
const COLOR_OPTION = /^couleurs?$/i

export async function fetchCatalog({
  category,
  search,
  sort,
}: {
  category?: string | null
  search?: string | null
  sort?: string | null
} = {}): Promise<CatalogProduct[]> {
  let query = supabase.from('products').select(COLUMNS).eq('status', 'active')

  if (sort === 'price_asc') {
    query = query.order('price_fcfa', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price_fcfa', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  if (category) query = query.eq('category', category)
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw error

  let products = (data || []) as CatalogProduct[]
  const productIds = products.map(p => p.id)
  if (productIds.length === 0) return products

  const [ratingsRes, viewsRes, variantsRes] = await Promise.all([
    supabase
      .from('product_ratings')
      .select('product_id, avg_rating, review_count')
      .in('product_id', productIds),
    supabase.from('product_views').select('product_id').in('product_id', productIds),
    supabase
      .from('product_variants')
      .select('product_id, option_values, image_url')
      .in('product_id', productIds),
  ])

  const ratingsById = new Map((ratingsRes.data || []).map((r: any) => [r.product_id, r]))

  const viewCounts = new Map<string, number>()
  for (const v of viewsRes.data || []) {
    viewCounts.set(v.product_id, (viewCounts.get(v.product_id) || 0) + 1)
  }

  // Seule l'option « Couleur » donne des pastilles sur la carte catalogue.
  // Mémoire ou Stockage ne se lisent que sur la fiche produit.
  const colorsByProduct = new Map<string, { value: string; image_url: string | null }[]>()
  for (const v of variantsRes.data || []) {
    const entry = Object.entries(v.option_values || {}).find(([k]) =>
      COLOR_OPTION.test(k.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    )
    if (!entry) continue
    const list = colorsByProduct.get(v.product_id) || []
    if (!list.some(c => c.value === entry[1])) {
      list.push({ value: entry[1] as string, image_url: v.image_url })
      colorsByProduct.set(v.product_id, list)
    }
  }

  products = products.map(p => ({
    ...p,
    avg_rating: ratingsById.get(p.id)?.avg_rating ?? null,
    review_count: ratingsById.get(p.id)?.review_count ?? 0,
    view_count: viewCounts.get(p.id) || 0,
    colors: colorsByProduct.get(p.id) || [],
  }))

  if (sort === 'rating') {
    products.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
  } else if (sort === 'popular') {
    products.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
  }

  return products
}

/** Rayons visibles, dans l'ordre défini en administration. */
export async function fetchCategoryRows() {
  const { data, error } = await supabase
    .from('categories')
    .select('value, label, short_label, icon, description, tagline, image_url, is_visible')
    .order('sort_order')

  // Tant que la migration des rayons n'est pas exécutée, la table n'existe
  // pas : l'appelant retombe alors sur la liste figée du code plutôt que
  // d'afficher une navigation vide.
  if (error || !data?.length) return null
  return data
}

/** Réglages de la zone d'accueil et diapositives publiées. */
export async function fetchHero(settingKeys: readonly string[]) {
  const [settingsRes, slidesRes] = await Promise.all([
    supabase.from('site_settings').select('key, value').in('key', settingKeys as string[]),
    supabase
      .from('promo_slides')
      .select('id, image_url, link_url, alt_text, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])
  return { settings: settingsRes.data, slides: slidesRes.data || [] }
}
