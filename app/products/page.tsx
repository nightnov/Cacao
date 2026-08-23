'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { CATEGORIES, categoryLabel } from '@/lib/categories'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
  created_at?: string
  avg_rating?: number | null
  review_count?: number
  view_count?: number
}

const sortOptions = [
  { value: '', label: 'Pertinence' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'popular', label: 'Plus populaires' }
]

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
      {products.map(product => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  )
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState(searchParams.get('sort') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [selectedCpu, setSelectedCpu] = useState('')
  const [popularFallback, setPopularFallback] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        if (search) params.set('search', search)
        if (sort) params.set('sort', sort)
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
  }, [category, search, sort])

  // Comble l'espace si peu de produits: propose des produits populaires réels (pas de remplissage inventé)
  useEffect(() => {
    if (loading || products.length >= 6 || search) return
    const fetchPopular = async () => {
      try {
        const res = await fetch('/api/products?sort=popular')
        const data = await res.json()
        setPopularFallback((data || []).filter((p: Product) => !products.some(existing => existing.id === p.id)).slice(0, 4))
      } catch {
        // silencieux: bloc purement complémentaire
      }
    }
    fetchPopular()
  }, [loading, products, search])

  const cpuOptions = useMemo(() => {
    const cpus = products.map(p => p.specs?.cpu).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    return Array.from(new Set(cpus))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (priceMin && p.price_fcfa < Number(priceMin)) return false
      if (priceMax && p.price_fcfa > Number(priceMax)) return false
      if (selectedCpu && p.specs?.cpu !== selectedCpu) return false
      return true
    })
  }, [products, priceMin, priceMax, selectedCpu])

  const hasActiveFilters = !!priceMin || !!priceMax || !!selectedCpu

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#241A14] mb-3">Prix (FCFA)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
          />
          <span className="text-[#7D6A5D]" aria-hidden="true">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
          />
        </div>
      </div>

      {cpuOptions.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#241A14] mb-3">Processeur</p>
          <div className="flex flex-wrap gap-2">
            {cpuOptions.map(cpu => (
              <button
                key={cpu}
                type="button"
                onClick={() => setSelectedCpu(selectedCpu === cpu ? '' : cpu)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCpu === cpu
                    ? 'bg-[#241A14] text-white border-[#241A14]'
                    : 'border-[#E8E0D8] text-[#5B4B41] hover:border-[#241A14]'
                }`}
              >
                {cpu}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => { setPriceMin(''); setPriceMax(''); setSelectedCpu('') }}
          className="text-sm text-[#C2410C] font-semibold hover:underline"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-10 py-16">
        <div className="text-sm text-[#7D6A5D] mb-6">
          <Link href="/" className="hover:text-[#C2410C]">Accueil</Link>
          {' / '}
          <span className="text-[#241A14]">Catalogue</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif font-semibold text-4xl mb-2 text-[#241A14]">
            {search ? `Résultats pour « ${search} »` : category ? categoryLabel[category] || category : 'Tous les produits'}
          </h1>
          {!loading && (
            <p className="text-[#5B4B41]">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Catégories. Défilement horizontal sur mobile plutôt qu'un pavé de 9 pastilles
            qui poussait les produits sous la ligne de flottaison. */}
        {!search && (
          <div className="mb-7 flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible">
            <Link href="/products" className="flex-shrink-0">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                !category
                  ? 'bg-[#241A14] text-white border-[#241A14]'
                  : 'bg-white border-[#E8E0D8] text-[#5B4B41] hover:border-[#241A14] hover:text-[#241A14]'
              }`}>
                Tous
              </span>
            </Link>

            {CATEGORIES.map(cat => (
              <Link key={cat.value} href={`/products?category=${cat.value}`} className="flex-shrink-0">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                  category === cat.value
                    ? 'bg-[#241A14] text-white border-[#241A14]'
                    : 'bg-white border-[#E8E0D8] text-[#5B4B41] hover:border-[#241A14] hover:text-[#241A14]'
                }`}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Barre d'outils : filtres mobile + tri */}
        <div className="flex items-center justify-between mb-8 gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              hasActiveFilters
                ? 'bg-[#241A14] text-white border-[#241A14]'
                : 'bg-white border-[#E8E0D8] text-[#241A14]'
            }`}
          >
            <SlidersHorizontal size={14} /> Filtrer
            {hasActiveFilters && <span className="text-xs">•</span>}
          </button>
          <div className="hidden lg:block" />
          <label className="flex items-center gap-2 text-sm text-[#7D6A5D]">
            <span className="hidden sm:inline">Trier par</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E8E0D8] rounded-full text-sm text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#C2410C] cursor-pointer"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {showFilters && (
          <div className="lg:hidden mb-8 bg-white border border-[#E8E0D8] rounded-2xl p-5">
            {FiltersPanel}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-10">
          {/* Filtres desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <p className="text-xs font-semibold text-[#7D6A5D] uppercase tracking-wide mb-4">Filtres</p>
              {FiltersPanel}
            </div>
          </aside>

          {/* Grille produits */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-9">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[#E8E0D8] aspect-square rounded-xl"></div>
                    <div className="pt-2.5 space-y-2">
                      <div className="h-3.5 bg-[#E8E0D8] rounded w-3/4"></div>
                      <div className="h-3.5 bg-[#E8E0D8] rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-9">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>

                {popularFallback.length > 0 && (
                  <div className="mt-16 pt-10 border-t border-[#E8E0D8]">
                    <h2 className="font-serif font-semibold text-xl text-[#241A14] mb-6">Vous pourriez aussi aimer</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-9">
                      {popularFallback.map(p => (
                        <ProductCard key={p.id} {...p} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : search ? (
              <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-[#E8E0D8]">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FAF7F4] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="font-serif font-semibold text-xl text-[#241A14] mb-2">
                  Aucun résultat pour « {search} »
                </h3>
                <p className="text-[#7D6A5D] max-w-md mx-auto mb-6">
                  Ce produit n&apos;est pas encore disponible dans notre catalogue. Il sera peut-être ajouté lors d&apos;une prochaine mise à jour. N&apos;hésitez pas à revenir vérifier, ou à parcourir le catalogue complet en attendant.
                </p>
                <Link href="/products">
                  <button className="px-6 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-full font-semibold text-sm transition-colors">
                    Voir tout le catalogue
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#5B4B41]">Aucun produit trouvé{hasActiveFilters ? ' avec ces filtres' : ' dans cette catégorie'}.</p>
              </div>
            )}
          </div>
        </div>
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
