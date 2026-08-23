'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { getSupabaseClient } from '@/lib/supabase'
import { Laptop } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { formatAmount } from '@/lib/format'

interface Product {
  id: string
  name: string
  slug: string
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
  image_urls: string[]
  created_at?: string
  avg_rating?: number | null
  review_count?: number
  view_count?: number
  specs?: Record<string, unknown>
}

function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-[#E8E0D8] aspect-square rounded-xl"></div>
          <div className="pt-2.5 space-y-2">
            <div className="h-3.5 bg-[#E8E0D8] rounded w-3/4"></div>
            <div className="h-3.5 bg-[#E8E0D8] rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductSection({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (products.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-10 py-14">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif font-semibold text-2xl text-[#241A14]">{title}</h2>
        {href && (
          <Link href={href} className="text-[#C2410C] font-semibold hover:underline text-sm">
            Voir tout →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {products.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        setProducts(data || [])
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchBanner = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'homepage_banner_url')
          .maybeSingle()
        setBannerUrl(data?.value || null)
      } catch (error) {
        console.error('Erreur lors du chargement de la bannière:', error)
      }
    }

    fetchProducts()
    fetchBanner()
  }, [])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return

    setNewsletterStatus('loading')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email: newsletterEmail.trim() }])
      if (error && error.code !== '23505') throw error
      setNewsletterStatus('success')
      setNewsletterEmail('')
    } catch (err) {
      console.error('Erreur newsletter:', err)
      setNewsletterStatus('error')
    }
  }

  const popular = [...products].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
  const deals = products.filter(p => !!p.compare_at_price_fcfa && p.compare_at_price_fcfa > p.price_fcfa).slice(0, 4)
  // Rayons à mettre en avant : ceux qui contiennent le plus de produits,
  // limités à 4 sections pour que la page reste lisible. Aucun rayon inventé.
  const topCategories = CATEGORIES
    .map(cat => ({ cat, items: products.filter(p => p.category === cat.value).slice(0, 4) }))
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 4)
  // Produit mis en avant dans le hero : le plus consulté qui a une vraie photo,
  // sinon le premier disponible. Aucun produit -> le hero reste sur une colonne.
  const heroProduct = popular.find(p => p.image_urls?.length > 0) || popular[0] || null

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Bandeau d'accueil compact. Volontairement court pour que les produits
          restent visibles sans faire défiler. La vignette de droite est un vrai
          produit du catalogue : vraie photo, vrai prix, lien réel. */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 pt-5">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#241A14] via-[#4A2F20] to-[#8A3F13] px-6 sm:px-9 py-7 lg:py-8 flex items-center gap-8">
          <div className="flex-1 min-w-0">
            <span className="inline-block bg-[#C2410C] text-white text-[10px] font-extrabold tracking-[0.7px] px-2.5 py-1 rounded-full mb-3">
              SÉLECTION CACAO
            </span>
            <h1 className="font-serif font-extrabold text-white text-2xl sm:text-3xl lg:text-[34px] leading-[1.12] tracking-tight mb-2.5">
              Le PC qu&apos;il vous faut,<br className="hidden sm:block" /> au juste prix.
            </h1>
            <p className="text-[#E4D3C6] text-[13.5px] leading-relaxed max-w-md mb-5">
              Portables, bureau et gaming. Payez en mobile money, recevez chez vous partout en Côte d&apos;Ivoire.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/products" className="px-6 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-full font-bold text-[13px] transition-colors active:scale-[0.98]">
                Voir le catalogue
              </Link>
              {deals.length > 0 && (
                <Link href="/products?sort=newest" className="px-6 py-2.5 bg-white hover:bg-[#F3EDE6] text-[#241A14] rounded-full font-bold text-[13px] transition-colors active:scale-[0.98]">
                  Les promotions
                </Link>
              )}
            </div>
          </div>

          {heroProduct && (
            <Link href={`/products/${heroProduct.slug}`} className="group hidden lg:block w-[275px] flex-shrink-0">
              <div className="bg-white rounded-xl p-3.5">
                <div className="h-[150px] flex items-center justify-center overflow-hidden">
                  {heroProduct.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroProduct.image_urls[0]}
                      alt={heroProduct.name}
                      className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <Laptop size={72} className="text-[#C2410C]" strokeWidth={1} />
                  )}
                </div>
                <p className="text-[11px] text-[#5B4B41] leading-[1.35] line-clamp-2 mt-2">{heroProduct.name}</p>
                <p className="text-[17px] font-extrabold text-[#241A14] mt-1 tabular-nums">
                  {formatAmount(heroProduct.price_fcfa)} FCFA
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Bannière promotionnelle */}
      {bannerUrl && (
        <section className="max-w-7xl mx-auto px-5 sm:px-10 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt="Offre spéciale Cacao"
            className="w-full rounded-2xl border border-[#E8E0D8] object-cover aspect-[3/1]"
          />
        </section>
      )}

      {/* Produits populaires */}
      {loading ? (
        <section className="max-w-7xl mx-auto px-5 sm:px-10 py-14">
          <h2 className="font-serif font-semibold text-2xl text-[#241A14] mb-8">Les PC les plus populaires</h2>
          <ProductGridSkeleton />
        </section>
      ) : products.length > 0 ? (
        <ProductSection title="Les PC les plus populaires 🔥" products={popular} href="/products?sort=popular" />
      ) : (
        <section className="max-w-7xl mx-auto px-5 sm:px-10 py-14">
          <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-[#E8E0D8]">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FAF7F4] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="font-serif font-semibold text-xl text-[#241A14] mb-2">
              Le catalogue arrive bientôt
            </h3>
            <p className="text-[#7D6A5D] max-w-sm mx-auto">
              Aucun produit n&apos;est disponible pour le moment. Les premiers produits seront ajoutés très prochainement.
            </p>
          </div>
        </section>
      )}

      {/* Rayons les plus fournis. Les sections se construisent à partir des
          produits réellement en ligne : un rayon vide ne s'affiche pas, et
          l'ordre suit le nombre de produits que contient chaque rayon. */}
      {topCategories.map(({ cat, items }) => (
        <ProductSection
          key={cat.value}
          title={cat.label}
          products={items}
          href={`/products?category=${cat.value}`}
        />
      ))}

      {/* Meilleures offres : uniquement si des remises réelles existent */}
      {deals.length > 0 && (
        <ProductSection title="Les meilleures offres" products={deals} href="/products" />
      )}

      {/* Newsletter */}
      <section className="bg-[#F3EDE6] border-t border-b border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-16 text-center">
          <h2 className="font-serif font-semibold text-2xl text-[#241A14] mb-2">Ne manquez aucune offre</h2>
          <p className="text-[#5B4B41] mb-6 max-w-md mx-auto">
            Recevez les nouveautés et les bonnes trouvailles CACAO.
          </p>
          {newsletterStatus === 'success' ? (
            <p className="text-[#1E7A46] font-semibold">✓ Merci, vous êtes inscrit(e) !</p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex items-center justify-center gap-2 max-w-md mx-auto flex-wrap">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="flex-1 min-w-[200px] px-4 py-2.5 border-2 border-[#241A14] rounded-full text-sm focus:outline-none bg-white"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {newsletterStatus === 'loading' ? 'Envoi...' : "S'abonner"}
              </button>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-red-600 text-sm mt-3">Une erreur est survenue, réessayez.</p>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
