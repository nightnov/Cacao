'use client'

import { useState, useEffect } from 'react'
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
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  tags: string[]
}

export default function Products() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const url = category ? `/api/products?category=${category}` : '/api/products'
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
  }, [category])

  const categoryLabel: Record<string, string> = {
    portable: 'Portables',
    bureau: 'Ordinateurs de bureau',
    accessoire: 'Accessoires'
  }

  return (
    <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-10 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif font-semibold text-4xl mb-2 text-[#1A1A1A]">
            {category ? categoryLabel[category] || category : 'Tous les produits'}
          </h1>
          <p className="text-[#56534C]">
            {products.length} produit{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Category filter links */}
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

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden animate-pulse">
                <div className="bg-[#E4DDCF] h-48"></div>
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-[#E4DDCF] rounded w-1/3"></div>
                  <div className="h-4 bg-[#E4DDCF] rounded w-2/3"></div>
                  <div className="h-3 bg-[#E4DDCF] rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} {...product} />
            ))}
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
