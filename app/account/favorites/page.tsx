'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'

interface FavoriteProduct {
  id: string
  name: string
  slug: string
  price_fcfa: number
  compare_at_price_fcfa: number | null
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
  image_urls: string[]
  created_at?: string
}

export default function Favorites() {
  const router = useRouter()
  const { user, loading: authLoading, isLoggedIn } = useAuth()
  const [products, setProducts] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/account/login')
    }
  }, [authLoading, isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn || !user) return

    const fetchFavorites = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('favorites')
          .select('product_id, products(id, name, slug, price_fcfa, compare_at_price_fcfa, category, availability, image_urls, created_at)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        const items = ((data as unknown as { products: FavoriteProduct | null }[]) || [])
          .map(row => row.products)
          .filter((p): p is FavoriteProduct => !!p)

        setProducts(items)
      } catch (err) {
        console.error('Erreur lors du chargement des favoris:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [isLoggedIn, user])

  if (authLoading || !isLoggedIn) {
    return (
      <main className="min-h-screen bg-bg-panel flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ink-dim border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-panel flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Mes favoris</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-bg-raised aspect-square rounded-xl"></div>
                <div className="pt-2.5 space-y-2">
                  <div className="h-3.5 bg-bg-raised rounded w-3/4"></div>
                  <div className="h-3.5 bg-bg-raised rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-bg-panel rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <div className="w-14 h-14 rounded-full bg-bg-sunken flex items-center justify-center mx-auto mb-4">
              <Heart size={22} className="text-ink-dimmer" strokeWidth={1.8} />
            </div>
            <h2 className="font-serif font-semibold text-xl text-ink mb-2">Aucun favori pour le moment</h2>
            <p className="text-ink-dimmer mb-6">Explorez le catalogue et ajoutez les produits qui vous plaisent en cliquant sur le cœur.</p>
            <Link href="/products">
              <Button variant="primary">Découvrir les produits</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {products.map(product => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
