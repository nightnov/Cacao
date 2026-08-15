'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: 'portable' | 'bureau' | 'accessoire'
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        if (search) params.set('search', search)
        const url = params.toString() ? `/api/products?${params.toString()}` : '/api/products'
        const res = await fetch(url)
        const data = await res.json()
        setProducts(data)
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [category, search])

  const categoryLabel: Record<string, string> = {
    portable: 'Portables',
    bureau: 'Ordinateurs de bureau',
    accessoire: 'Accessoires'
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-10 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif font-semibold text-4xl mb-2 text-[#1A1A1A]">
            {search ? `Résultats pour « ${search} »` : category ? categoryLabel[category] || category : 'Tous les produits'}
          </h1>
          {!loading && (
            <p className="text-[#56534C]">
              {products.length} produit{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Category filter links */}
        {!search && (
          <div className="mb-12 flex gap-2 flex-wrap">
            <Link href="/products">
              <button className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                !category
                  ? 'bg-[#1A1A1A] text-[#FBF6EE]'
                  : 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FBF6EE]'
              }`}>
                Tous
              </button>
            </Link>

            {['portable', 'bureau', 'accessoire'].map(cat => (
              <Link key={cat} href={`/products?category=${cat}`}>
                <button className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  category === cat
                    ? 'bg-[#1A1A1A] text-[#FBF6EE]'
                    : 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FBF6EE]'
                }`}>
                  {categoryLabel[cat]}
                </button>
              </Link>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#E4DDCF] aspect-square rounded-xl"></div>
                <div className="pt-2.5 space-y-2">
                  <div className="h-3.5 bg-[#E4DDCF] rounded w-3/4"></div>
                  <div className="h-3.5 bg-[#E4DDCF] rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {products.map(product => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : search ? (
          <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-[#E4DDCF]">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FBF6EE] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-2">
              Aucun résultat pour « {search} »
            </h3>
            <p className="text-[#8A8579] max-w-md mx-auto mb-6">
              Ce produit n&apos;est pas encore disponible dans notre catalogue. Il sera peut-être ajouté lors d&apos;une prochaine mise à jour — n&apos;hésitez pas à revenir vérifier, ou à parcourir le catalogue complet en attendant.
            </p>
            <Link href="/products">
              <button className="px-6 py-2.5 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-full font-semibold text-sm transition-colors">
                Voir tout le catalogue
              </button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#56534C]">Aucun produit trouvé dans cette catégorie.</p>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

export default function Products() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <ProductsContent />
    </Suspense>
  )
}
