'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { labelFor } from '@/lib/categories'
import { btn } from '@/lib/ui'
import { useCategories } from '@/hooks/useCategories'

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
  const categories = useCategories()
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
        /**
         * `no-store` : le navigateur gardait la réponse d'une visite
         * précédente. Un produit reclassé dans un autre rayon continuait donc
         * d'apparaître à son ancienne place, ou disparaissait de la nouvelle,
         * et le compteur annonçait « 1 produit au catalogue » quand la base en
         * comptait quatre. Le catalogue est ce qu'un client consulte avant
         * d'acheter : il ne peut pas décrire l'état d'avant hier.
         */
        const res = await fetch(url, { cache: 'no-store' })
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
        const res = await fetch('/api/products?sort=popular', { cache: 'no-store' })
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

  const inputCls = 'w-full px-3 py-2 text-[13px] bg-bg-raised border border-border-mid rounded-lg text-ink outline-none focus:border-border-strong transition-colors'

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[12px] tracking-[0.6px] text-ink mb-3">PRIX (FCFA)</p>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} className={inputCls} />
          <span className="text-ink-faint" aria-hidden="true">-</span>
          <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} className={inputCls} />
        </div>
      </div>

      {cpuOptions.length > 0 && (
        <div>
          <p className="font-display text-[12px] tracking-[0.6px] text-ink mb-3">PROCESSEUR</p>
          <div className="flex flex-wrap gap-2">
            {cpuOptions.map(cpu => (
              <button
                key={cpu}
                type="button"
                onClick={() => setSelectedCpu(selectedCpu === cpu ? '' : cpu)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  selectedCpu === cpu
                    ? 'bg-bg-raised text-ink border-border-strong'
                    : 'bg-bg-raised border-border-mid text-ink-dim hover:border-border-strong'
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
        <p className="font-display text-[12px] tracking-[0.6px] text-ink mb-3">RAYONS</p>
        <div className="flex flex-col">
          <Link
            href="/products"
            className={`text-[13px] py-1.5 transition-colors ${!category ? 'text-ink font-bold' : 'text-ink-dimmer hover:text-ink'}`}
          >
            Tous les produits
          </Link>
          {categories.map(cat => (
            <Link
              key={cat.value}
              href={`/products?category=${cat.value}`}
              className={`text-[13px] py-1.5 transition-colors ${category === cat.value ? 'text-ink font-bold' : 'text-ink-dimmer hover:text-ink'}`}
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
          className="text-[13px] text-ink-dim font-bold hover:text-ink hover:underline"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      {/* La barre d'avantages a été retirée d'ici : elle occupait toute la
          largeur au-dessus du fil d'Ariane et repoussait les produits sous la
          ligne de flottaison. Sur un catalogue, ce sont les produits qui
          doivent arriver en premier. Ces garanties restent présentes sur
          l'accueil, dans la section « Pourquoi CACAO », et sur chaque fiche
          produit juste sous le bouton d'achat — là où la question se pose. */}

      {/* En-tête de rayon : titre compact et compteur, façon page de série */}
      <header className="border-b border-border bg-gradient-to-b from-bg-panel to-bg">
        <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 py-6">
          <Breadcrumb
            className="mb-3"
            items={
              category
                ? [
                    { label: 'Accueil', href: '/' },
                    { label: 'Catalogue', href: '/products' },
                    { label: labelFor(category, categories) },
                  ]
                : [{ label: 'Accueil', href: '/' }, { label: 'Catalogue' }]
            }
          />

          <h1 className="font-display text-[24px] sm:text-[30px] text-ink">
            {search
              ? `RÉSULTATS POUR « ${search.toUpperCase()} »`
              : category
              ? (labelFor(category, categories)).toUpperCase()
              : 'TOUS LES PRODUITS'}
          </h1>
          {!loading && (
            <p className="text-[13px] text-ink-dimmer mt-1.5">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant à vos filtres' : ' au catalogue'}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 py-7">
        {/* Rayons en défilement horizontal : visibles sous lg, où le panneau
            latéral est masqué. */}
        {!search && (
          <div className="lg:hidden mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Link href="/products" className="flex-shrink-0">
              <span className={`inline-block px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                !category ? 'bg-bg-raised text-ink border-border-strong' : 'bg-bg-panel border-border text-ink-dim'
              }`}>
                Tous
              </span>
            </Link>
            {categories.map(cat => (
              <Link key={cat.value} href={`/products?category=${cat.value}`} className="flex-shrink-0">
                <span className={`inline-block px-3.5 py-2 rounded-lg text-[13px] font-medium border whitespace-nowrap transition-colors ${
                  category === cat.value ? 'bg-bg-raised text-ink border-border-strong' : 'bg-bg-panel border-border text-ink-dim'
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
              hasActiveFilters ? 'bg-bg-raised text-ink border-border-strong' : 'bg-bg-panel border-border text-ink'
            }`}
          >
            <SlidersHorizontal size={14} /> Filtrer
          </button>
          <div className="hidden lg:block" />
          <label className="flex items-center gap-2 text-[13px] text-ink-dimmer">
            <span className="hidden sm:inline">Trier par</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-3.5 py-2 bg-bg-raised border border-border-mid rounded-lg text-[13px] text-ink outline-none focus:border-border-strong cursor-pointer transition-colors"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {showFilters && (
          <div className="lg:hidden mb-6 bg-bg-panel border border-border rounded-xl p-5">
            {FiltersPanel}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[232px,1fr] gap-6 lg:gap-8">
          {/* Panneau de filtres, en carte comme le reste de l'interface */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-bg-panel border border-border rounded-xl p-5">
              {FiltersPanel}
            </div>
          </aside>

          {/* Grille produits */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-bg-raised aspect-square rounded-xl"></div>
                    <div className="pt-2.5 space-y-2">
                      <div className="h-3.5 bg-bg-raised rounded w-3/4"></div>
                      <div className="h-3.5 bg-bg-raised rounded w-1/3"></div>
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
                  <div className="mt-16 pt-10 border-t border-border">
                    <h2 className="font-serif font-semibold text-xl text-ink mb-6">Vous pourriez aussi aimer</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {popularFallback.map(p => (
                        <ProductCard key={p.id} {...p} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : search ? (
              <div className="text-center py-20 px-6 bg-bg-panel rounded-2xl border-2 border-dashed border-border">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bg-sunken flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="font-serif font-semibold text-xl text-ink mb-2">
                  Aucun résultat pour « {search} »
                </h3>
                <p className="text-ink-dimmer max-w-md mx-auto mb-6">
                  Ce produit n&apos;est pas encore disponible dans notre catalogue. Il sera peut-être ajouté lors d&apos;une prochaine mise à jour. N&apos;hésitez pas à revenir vérifier, ou à parcourir le catalogue complet en attendant.
                </p>
                <Link href="/products" className={btn('solid', 'md')}>
                  Voir tout le catalogue
                </Link>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-ink-dim">Aucun produit trouvé{hasActiveFilters ? ' avec ces filtres' : ' dans cette catégorie'}.</p>
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
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <ProductsContent />
    </Suspense>
  )
}
