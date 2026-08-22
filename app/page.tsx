'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TrustSection } from '@/components/TrustSection'
import { Badge } from '@/components/Badge'
import { ProductCard } from '@/components/ProductCard'
import { getSupabaseClient } from '@/lib/supabase'
import { Laptop } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

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
          <div className="bg-[#E4DDCF] aspect-square rounded-xl"></div>
          <div className="pt-2.5 space-y-2">
            <div className="h-3.5 bg-[#E4DDCF] rounded w-3/4"></div>
            <div className="h-3.5 bg-[#E4DDCF] rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductSection({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (products.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-10 py-14">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A]">{title}</h2>
        {href && (
          <Link href={href} className="text-[#FF6600] font-semibold hover:underline text-sm">
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
  const newest = [...products].slice(0, 4) // déjà trié par created_at desc côté API
  const deals = products.filter(p => !!p.compare_at_price_fcfa && p.compare_at_price_fcfa > p.price_fcfa).slice(0, 4)
  const gaming = products.filter(p => p.category === 'gaming').slice(0, 4)
  const forWork = products.filter(p => p.category === 'portable' || p.category === 'bureau').slice(0, 4)

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero — deux colonnes sur fond crème */}
      <section className="bg-cream border-b border-[#E4DDCF]">
        <div className="max-w-7xl mx-auto px-10 py-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge>DÉCOUVREZ LA SÉLECTION CACAO</Badge>
            <h1 className="font-serif font-semibold text-4xl leading-tight mb-3 mt-4">
              Trouvez le PC qui vous <em className="italic text-[#FF6600]">correspond.</em>
            </h1>
            <p className="text-[#56534C] text-base max-w-md leading-relaxed mb-6">
              Des ordinateurs performants pour le travail, les études et le gaming. Livraison partout en Côte d&apos;Ivoire.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/products?sort=popular" className="px-6 py-2.5 bg-[#2B1810] hover:bg-[#1A0F0A] text-white rounded-full font-semibold text-sm transition-colors">
                Voir les PC populaires
              </Link>
              <Link href="/products?sort=newest" className="px-6 py-2.5 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-full font-semibold text-sm transition-colors">
                Découvrir les offres
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#1A1A1A] via-[#2B1810] to-[#FF6600]/40 flex items-center justify-center">
              <Laptop size={96} className="text-white/90" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      <TrustSection />

      {/* Bannière promotionnelle */}
      {bannerUrl && (
        <section className="max-w-7xl mx-auto px-10 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt="Offre spéciale Cacao"
            className="w-full rounded-2xl border border-[#E4DDCF] object-cover aspect-[3/1]"
          />
        </section>
      )}

      {/* Produits populaires */}
      {loading ? (
        <section className="max-w-7xl mx-auto px-10 py-14">
          <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-8">Les PC les plus populaires</h2>
          <ProductGridSkeleton />
        </section>
      ) : products.length > 0 ? (
        <ProductSection title="Les PC les plus populaires 🔥" products={popular} href="/products?sort=popular" />
      ) : (
        <section className="max-w-7xl mx-auto px-10 py-14">
          <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-[#E4DDCF]">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FBF6EE] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-2">
              Le catalogue arrive bientôt
            </h3>
            <p className="text-[#8A8579] max-w-sm mx-auto">
              Aucun produit n&apos;est disponible pour le moment. Les premiers produits seront ajoutés très prochainement.
            </p>
          </div>
        </section>
      )}

      {/* Rangée de catégories */}
      <section className="max-w-7xl mx-auto px-10 pb-14">
        <div className="flex gap-6 flex-wrap justify-center sm:justify-between">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.value}
                href={`/products?category=${cat.value}`}
                className="flex flex-col items-center gap-2 text-[#1A1A1A] hover:text-[#FF6600] transition-colors w-20"
              >
                <div className="w-12 h-12 rounded-full bg-[#FBF6EE] flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-center">{cat.label}</span>
              </Link>
            )
          })}
          <Link href="/products" className="flex flex-col items-center gap-2 text-[#1A1A1A] hover:text-[#FF6600] transition-colors w-20">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-center">Voir tout</span>
          </Link>
        </div>
      </section>

      {/* PC Gaming — n'apparaît que si des produits gaming existent réellement */}
      {gaming.length > 0 && (
        <section className="bg-[#1A1A1A]">
          <div className="max-w-7xl mx-auto px-10 py-14">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-serif font-semibold text-2xl text-white">PC Gaming</h2>
                <p className="text-sm text-white/60 mt-1">Des performances extrêmes pour une expérience de jeu ultime.</p>
              </div>
              <Link href="/products?category=gaming" className="text-[#FF6600] font-semibold hover:underline text-sm">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
              {gaming.map(product => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PC pour le travail + Meilleures offres, côte à côte */}
      {(forWork.length > 0 || deals.length > 0) && (
        <section className="max-w-7xl mx-auto px-10 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {forWork.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif font-semibold text-xl text-[#1A1A1A]">PC pour le travail et les études</h2>
                  <Link href="/products?category=portable" className="text-[#FF6600] font-semibold hover:underline text-sm">Voir tout →</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {forWork.map(product => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>
              </div>
            )}
            {deals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif font-semibold text-xl text-[#1A1A1A]">Les meilleures offres</h2>
                  <Link href="/products?sort=newest" className="text-[#FF6600] font-semibold hover:underline text-sm">Voir tout →</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {deals.map(product => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-[#FBF3E7] border-t border-b border-[#E4DDCF]">
        <div className="max-w-7xl mx-auto px-10 py-16 text-center">
          <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-2">Ne manquez aucune offre</h2>
          <p className="text-[#56534C] mb-6 max-w-md mx-auto">
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
                className="flex-1 min-w-[200px] px-4 py-2.5 border-2 border-[#1A1A1A] rounded-full text-sm focus:outline-none bg-white"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-2.5 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
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
