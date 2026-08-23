'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { TrustBar } from '@/components/TrustBar'
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
  colors?: { value: string; image_url: string | null }[]
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

  const inputCls = 'w-full px-3 py-2 text-[13px] bg-[#2A2D31] border border-[#3E4247] rounded-lg text-[#EEF2F7] outline-none focus:border-[#FDC700] transition-colors'

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[12px] tracking-[0.6px] text-[#EEF2F7] mb-3">PRIX (FCFA)</p>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} className={inputCls} />
          <span className="text-[#6F767E]" aria-hidden="true">-</span>
          <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} className={inputCls} />
        </div>
      </div>

      {cpuOptions.length > 0 && (
        <div>
          <p className="font-display text-[12px] tracking-[0.6px] text-[#EEF2F7] mb-3">PROCESSEUR</p>
          <div className="flex flex-wrap gap-2">
            {cpuOptions.map(cpu => (
              <button
                key={cpu}
                type="button"
                onClick={() => setSelectedCpu(selectedCpu === cpu ? '' : cpu)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  selectedCpu === cpu
                    ? 'bg-[#FDC700]/10 text-[#FDC700] border-[#FDC700]'
                    : 'bg-[#2A2D31] border-[#3E4247] text-[#B3B8BE] hover:border-[#4E5257]'
                }`}
              >
                {cpu}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rayons dans le panneau latéral : sur un catalogue, ils servent de
          navigation permanente plutôt que de rangée de pastilles isolée. */}
      <div className="hidden lg:block">
        <p className="font-display text-[12px] tracking-[0.6px] text-[#EEF2F7] mb-3">RAYONS</p>
        <div className="flex flex-col">
          <Link
            href="/products"
            className={`text-[13px] py-1.5 transition-colors ${!category ? 'text-[#FDC700] font-bold' : 'text-[#8E959D] hover:text-[#EEF2F7]'}`}
          >
            Tous les produits
          </Link>
          {CATEGORIES.map(cat => (
            <Link
              key={cat.value}
              href={`/products?category=${cat.value}`}
              className={`text-[13px] py-1.5 transition-colors ${category === cat.value ? 'text-[#FDC700] font-bold' : 'text-[#8E959D] hover:text-[#EEF2F7]'}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => { setPriceMin(''); setPriceMax(''); setSelectedCpu('') }}
          className="text-[13px] text-[#FDC700] font-bold hover:underline"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-[#222427] flex flex-col">
      <Navbar />
      <TrustBar />

      {/* En-tête de rayon : titre compact et compteur, façon page de série */}
      <header className="border-b border-[#35383C] bg-gradient-to-b from-[#1C2021] to-[#222427]">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[12px] text-[#8E959D] mb-3">
            <Link href="/" className="hover:text-[#FDC700] transition-colors">Accueil</Link>
            <span aria-hidden="true">/</span>
            {category ? (
              <>
                <Link href="/products" className="hover:text-[#FDC700] transition-colors">Catalogue</Link>
                <span aria-hidden="true">/</span>
                <span className="text-[#EEF2F7]">{categoryLabel[category] || category}</span>
              </>
            ) : (
              <span className="text-[#EEF2F7]">Catalogue</span>
            )}
          </nav>

          <h1 className="font-display text-[24px] sm:text-[30px] text-[#EEF2F7]">
            {search
              ? `RÉSULTATS POUR « ${search.toUpperCase()} »`
              : category
              ? (categoryLabel[category] || category).toUpperCase()
              : 'TOUS LES PRODUITS'}
          </h1>
          {!loading && (
            <p className="text-[13px] text-[#8E959D] mt-1.5">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant à vos filtres' : ' au catalogue'}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-7">
        {/* Rayons en défilement horizontal : visibles sous lg, où le panneau
            latéral est masqué. */}
        {!search && (
          <div className="lg:hidden mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Link href="/products" className="flex-shrink-0">
              <span className={`inline-block px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                !category ? 'bg-[#FDC700]/10 text-[#FDC700] border-[#FDC700]' : 'bg-[#1C2021] border-[#35383C] text-[#B3B8BE]'
              }`}>
                Tous
              </span>
            </Link>
            {CATEGORIES.map(cat => (
              <Link key={cat.value} href={`/products?category=${cat.value}`} className="flex-shrink-0">
                <span className={`inline-block px-3.5 py-2 rounded-lg text-[13px] font-medium border whitespace-nowrap transition-colors ${
                  category === cat.value ? 'bg-[#FDC700]/10 text-[#FDC700] border-[#FDC700]' : 'bg-[#1C2021] border-[#35383C] text-[#B3B8BE]'
                }`}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Barre d'outils : filtres mobile + tri */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold border transition-colors ${
              hasActiveFilters ? 'bg-[#FDC700]/10 text-[#FDC700] border-[#FDC700]' : 'bg-[#1C2021] border-[#35383C] text-[#EEF2F7]'
            }`}
          >
            <SlidersHorizontal size={14} /> Filtrer
          </button>
          <div className="hidden lg:block" />
          <label className="flex items-center gap-2 text-[13px] text-[#8E959D]">
            <span className="hidden sm:inline">Trier par</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-3.5 py-2 bg-[#2A2D31] border border-[#3E4247] rounded-lg text-[13px] text-[#EEF2F7] outline-none focus:border-[#FDC700] cursor-pointer transition-colors"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {showFilters && (
          <div className="lg:hidden mb-6 bg-[#1C2021] border border-[#35383C] rounded-xl p-5">
            {FiltersPanel}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[232px,1fr] gap-6 lg:gap-8">
          {/* Panneau de filtres, en carte comme le reste de l'interface */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-[#1C2021] border border-[#35383C] rounded-xl p-5">
              {FiltersPanel}
            </div>
          </aside>

          {/* Grille produits */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[#2A2D31] aspect-square rounded-xl"></div>
                    <div className="pt-2.5 space-y-2">
                      <div className="h-3.5 bg-[#2A2D31] rounded w-3/4"></div>
                      <div className="h-3.5 bg-[#2A2D31] rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>

                {popularFallback.length > 0 && (
                  <div className="mt-16 pt-10 border-t border-[#35383C]">
                    <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-6">Vous pourriez aussi aimer</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {popularFallback.map(p => (
                        <ProductCard key={p.id} {...p} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : search ? (
              <div className="text-center py-20 px-6 bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C]">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#171A1C] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-2">
                  Aucun résultat pour « {search} »
                </h3>
                <p className="text-[#8E959D] max-w-md mx-auto mb-6">
                  Ce produit n&apos;est pas encore disponible dans notre catalogue. Il sera peut-être ajouté lors d&apos;une prochaine mise à jour. N&apos;hésitez pas à revenir vérifier, ou à parcourir le catalogue complet en attendant.
                </p>
                <Link href="/products">
                  <button className="px-6 py-2.5 bg-[#FDC700] hover:bg-[#E0B000] text-[#1A1A1A] rounded-full font-semibold text-sm transition-colors">
                    Voir tout le catalogue
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#B3B8BE]">Aucun produit trouvé{hasActiveFilters ? ' avec ces filtres' : ' dans cette catégorie'}.</p>
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
    <Suspense fallback={<main className="min-h-screen bg-[#1C2021]" />}>
      <ProductsContent />
    </Suspense>
  )
}
