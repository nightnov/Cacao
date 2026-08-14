'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TrustSection } from '@/components/TrustSection'
import { Badge } from '@/components/Badge'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/Button'

interface Product {
  id: string
  name: string
  slug: string
  price_fcfa: number
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        setProducts((data || []).slice(0, 3))
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <main className="min-h-screen bg-[#FBF6EE]">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-10 py-12">
        <Badge>NOUVEAU SUR LE MARCHÉ</Badge>
        <h1 className="font-serif font-semibold text-5xl leading-tight mb-4 max-w-2xl mt-5">
          Des PC pro, à prix <em className="italic text-[#E85D25]">juste.</em>
        </h1>
        <p className="text-[#56534C] text-base max-w-md leading-relaxed">
          Une sélection de machines fiables, choisies pour durer, livrées chez vous en toute confiance.
        </p>
      </section>

      <TrustSection />

      {/* Catalogue preview */}
      <section className="max-w-7xl mx-auto px-10 py-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-serif font-semibold text-3xl">Le catalogue</h2>
          <Link href="/products" className="text-[#E85D25] font-semibold hover:underline">
            Voir tout le catalogue →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
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
          <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-[#E4DDCF]">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FBF6EE] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-2">
              Le catalogue arrive bientôt
            </h3>
            <p className="text-[#8A8579] mb-8 max-w-sm mx-auto">
              Aucun produit n&apos;est disponible pour le moment. Les premiers PC seront ajoutés très prochainement.
            </p>
            <Link href="/admin/login">
              <Button variant="outline" size="sm">
                Ajouter des produits →
              </Button>
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
