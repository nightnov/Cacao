'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TrustSection } from '@/components/TrustSection'
import { Badge } from '@/components/Badge'
import { ProductCard } from '@/components/ProductCard'
import { getSupabaseClient } from '@/lib/supabase'

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
}

const categoryShortcuts = [
  { label: 'Informatique', href: '/products', active: true },
  { label: 'Maison & déco', href: null, active: false },
  { label: 'Mode', href: null, active: false },
  { label: 'Beauté', href: null, active: false },
  { label: 'Loisirs', href: null, active: false },
  { label: 'Services', href: null, active: false }
]

const editorialCards = [
  {
    title: 'Trouver le PC adapté à vos besoins',
    text: 'Portable ou bureau, bureautique ou puissance — un aperçu clair pour choisir sans se perdre.',
    href: '/products?category=portable'
  },
  {
    title: 'Nos indispensables du moment',
    text: 'Une sélection resserrée d’accessoires utiles, choisis pour leur fiabilité.',
    href: '/products?category=accessoire'
  }
]

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
        setProducts((data || []).slice(0, 8))
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

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-10 py-12">
        <Badge>DÉCOUVREZ LA SÉLECTION CACAO</Badge>
        <h1 className="font-serif font-semibold text-5xl leading-tight mb-4 max-w-2xl mt-5">
          Trouvez ce qui vous <em className="italic text-[#FF6600]">plaît.</em>
        </h1>
        <p className="text-[#56534C] text-base max-w-md leading-relaxed mb-6">
          Des produits choisis avec soin, livrés chez vous en toute confiance en Côte d&apos;Ivoire.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/products" className="px-6 py-3 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-full font-semibold text-sm transition-colors">
            Découvrir les produits
          </Link>
          <a href="#categories" className="px-6 py-3 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-full font-semibold text-sm transition-colors">
            Explorer les catégories
          </a>
        </div>
      </section>

      {/* Category shortcuts */}
      <section id="categories" className="max-w-7xl mx-auto px-10 pb-4">
        <div className="flex gap-3 flex-wrap">
          {categoryShortcuts.map(cat =>
            cat.active && cat.href ? (
              <Link
                key={cat.label}
                href={cat.href}
                className="px-5 py-2.5 rounded-full border-2 border-[#1A1A1A] text-sm font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
              >
                {cat.label}
              </Link>
            ) : (
              <span
                key={cat.label}
                className="px-5 py-2.5 rounded-full border border-[#E4DDCF] text-sm text-[#C4BDAF] flex items-center gap-2 cursor-default"
              >
                {cat.label}
                <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded-full">Bientôt</span>
              </span>
            )
          )}
        </div>
      </section>

      <TrustSection />

      {/* Bannière promotionnelle */}
      {bannerUrl && (
        <section className="max-w-7xl mx-auto px-10 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt="Offre spéciale Cacao"
            className="w-full rounded-2xl border border-[#E4DDCF] object-cover aspect-[3/1]"
          />
        </section>
      )}

      {/* Sélection du moment */}
      <section className="max-w-7xl mx-auto px-10 py-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-serif font-semibold text-3xl">Sélection du moment</h2>
          <Link href="/products" className="text-[#FF6600] font-semibold hover:underline">
            Voir tout le catalogue →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {[...Array(4)].map((_, i) => (
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
        ) : (
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
        )}
      </section>

      {/* Découverte éditoriale */}
      <section className="bg-[#FBF3E7] border-t border-b border-[#E4DDCF]">
        <div className="max-w-7xl mx-auto px-10 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {editorialCards.map(card => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-2xl border border-[#E4DDCF] p-8 hover:shadow-md transition-shadow"
            >
              <h3 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-2">{card.title}</h3>
              <p className="text-sm text-[#56534C] mb-4">{card.text}</p>
              <span className="text-sm font-semibold text-[#FF6600]">Découvrir →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-10 py-16 text-center">
        <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-2">Restez informé</h2>
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
              className="flex-1 min-w-[200px] px-4 py-2.5 border-2 border-[#1A1A1A] rounded-full text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              className="px-6 py-2.5 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {newsletterStatus === 'loading' ? 'Envoi...' : 'S’inscrire'}
            </button>
          </form>
        )}
        {newsletterStatus === 'error' && (
          <p className="text-red-600 text-sm mt-3">Une erreur est survenue, réessayez.</p>
        )}
      </section>

      <Footer />
    </main>
  )
}
