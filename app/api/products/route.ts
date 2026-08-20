import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.trim()
    const sort = searchParams.get('sort')

    let query = supabase
      .from('products')
      .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, created_at')
      .eq('status', 'active')

    if (sort === 'price_asc') {
      query = query.order('price_fcfa', { ascending: true })
    } else if (sort === 'price_desc') {
      query = query.order('price_fcfa', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (search) {
      await supabase.from('search_logs').insert([{ query: search, results_count: data?.length || 0 }])
    }

    let products = data || []
    const productIds = products.map((p: any) => p.id)

    if (productIds.length > 0) {
      const [ratingsRes, viewsRes] = await Promise.all([
        supabase.from('product_ratings').select('product_id, avg_rating, review_count').in('product_id', productIds),
        supabase.from('product_views').select('product_id').in('product_id', productIds)
      ])

      const ratingsById = new Map((ratingsRes.data || []).map((r: any) => [r.product_id, r]))
      const viewCounts = new Map<string, number>()
      for (const v of viewsRes.data || []) {
        viewCounts.set(v.product_id, (viewCounts.get(v.product_id) || 0) + 1)
      }

      products = products.map((p: any) => ({
        ...p,
        avg_rating: ratingsById.get(p.id)?.avg_rating ?? null,
        review_count: ratingsById.get(p.id)?.review_count ?? 0,
        view_count: viewCounts.get(p.id) || 0
      }))

      if (sort === 'rating') {
        products.sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0))
      } else if (sort === 'popular') {
        products.sort((a: any, b: any) => b.view_count - a.view_count)
      }
    }

    return Response.json(products)
  } catch (error) {
    console.error('API error:', error)
    return Response.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
