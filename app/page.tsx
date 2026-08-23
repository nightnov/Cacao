'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { TrustBar } from '@/components/TrustBar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { getSupabaseClient } from '@/lib/supabase'
import {
  Laptop, MapPin, ShieldCheck, Truck, RotateCcw, Headphones,
  Keyboard, Mouse, HardDrive, CreditCard
} from 'lucide-react'
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

/** Gammes mises en avant. Le prix « à partir de » est calculé sur les vrais produits. */
const GAMMES = ['portable', 'bureau', 'gaming', 'accessoire'] as const
const GAMME_PITCH: Record<string, string> = {
  portable: 'Mobilité et autonomie pour le travail et les études.',
  bureau: 'Puissance stable pour un poste fixe au quotidien.',
  gaming: 'Cartes dédiées et écrans à haute fréquence.',
  accessoire: 'Claviers, souris, casques, sacoches et câbles.'
}

function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse bg-[#1C2021] border border-[#35383C] rounded-xl overflow-hidden">
          <div className="h-[132px] sm:h-[158px] bg-[#171A1C]" />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 bg-[#2A2D31] rounded w-4/5" />
            <div className="h-3 bg-[#2A2D31] rounded w-3/5" />
            <div className="h-4 bg-[#2A2D31] rounded w-2/5 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductSection({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (products.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
      <div className="flex items-end justify-between gap-4 mb-5">
        <h2 className="font-display text-[19px] sm:text-[22px] tracking-[1px] text-[#EEF2F7]">{title}</h2>
        {href && (
          <Link href={href} className="text-[12.5px] font-bold text-[#FDC700] hover:underline whitespace-nowrap">
            Voir tout →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => <ProductCard key={p.id} {...p} />)}
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
        setProducts((await res.json()) || [])
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
          .from('site_settings').select('value').eq('key', 'homepage_banner_url').maybeSingle()
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

  const popular = [...products].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4)
  const deals = products.filter(p => !!p.compare_at_price_fcfa && p.compare_at_price_fcfa > p.price_fcfa).slice(0, 4)
  const heroProduct = popular.find(p => p.image_urls?.length > 0) || popular[0] || null

  // Rayons les plus fournis : construits sur les produits réellement en ligne
  const topCategories = CATEGORIES
    .map(cat => ({ cat, items: products.filter(p => p.category === cat.value).slice(0, 4) }))
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 4)

  const gammes = GAMMES.map(value => {
    const cat = CATEGORIES.find(c => c.value === value)!
    const items = products.filter(p => p.category === value)
    const min = items.length > 0 ? Math.min(...items.map(p => p.price_fcfa)) : null
    return { cat, min, count: items.length }
  })

  return (
    <main className="min-h-screen bg-[#222427]">
      <Navbar />
      <TrustBar />

      {/* Hero : texte à gauche, grande vitrine promotionnelle à droite */}
      <section className="border-b border-[#35383C] bg-gradient-to-b from-[#1C2021] to-[#222427]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[355px,1fr] gap-7 items-stretch">
          <div className="flex flex-col justify-center">
            <span className="inline-flex self-start items-center gap-2 border border-[#FDC700]/40 text-[#FDC700] text-[10px] font-bold tracking-[1.4px] px-3 py-1.5 rounded-full mb-4">
              <MapPin size={12} strokeWidth={2} /> LIVRAISON PARTOUT EN CÔTE D&apos;IVOIRE
            </span>
            <h1 className="font-display text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.06] tracking-[1px] text-[#EEF2F7] mb-3">
              LA PERFORMANCE,<br />SANS <span className="text-[#FDC700]">COMPROMIS.</span>
            </h1>
            <p className="text-[13.5px] text-[#B3B8BE] leading-[1.65] mb-6">
              Ordinateurs portables, bureau et gaming. Commandez en ligne, payez en mobile money, recevez chez vous.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <Link href="/products" className="px-6 py-3 bg-[#FDC700] hover:bg-[#E0B000] text-[#1A1A1A] rounded-lg font-bold text-[13px] transition-colors active:scale-[0.98]">
                Voir le catalogue
              </Link>
              <Link href="/products?category=accessoire" className="px-6 py-3 border border-[#4E5257] hover:border-[#FDC700] text-[#EEF2F7] rounded-lg font-bold text-[13px] transition-colors active:scale-[0.98]">
                Nos accessoires
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 sm:gap-6 mt-7 pt-5 border-t border-[#35383C]">
              {[
                { icon: ShieldCheck, t: 'Paiement sécurisé', s: 'Mobile money ou carte' },
                { icon: Truck, t: 'Moins de 5 jours', s: 'Livraison suivie' },
                { icon: RotateCcw, t: 'Retour 14 jours', s: 'Sans justification' }
              ].map(({ icon: Icon, t, s }) => (
                <div key={t} className="flex gap-2.5 items-start">
                  <Icon size={17} strokeWidth={1.9} className="text-[#FDC700] flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-[12px] font-bold text-[#EEF2F7]">{t}</span>
                    <span className="block text-[10.5px] text-[#8E959D]">{s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vitrine : bannière définie dans l'admin, sinon le produit le plus consulté */}
          {bannerUrl ? (
            <Link href="/products" className="group relative rounded-xl overflow-hidden border border-[#3A3E42] bg-[#171A1C] min-h-[240px] lg:min-h-[340px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Offre en cours" className="w-full h-full object-cover min-h-[240px] lg:min-h-[340px]" />
              <span className="absolute top-4 left-4 bg-[#FDC700] text-[#1A1A1A] text-[10px] font-extrabold tracking-[1px] px-3 py-1.5 rounded">
                EN CE MOMENT
              </span>
            </Link>
          ) : heroProduct ? (
            <Link href={`/products/${heroProduct.slug}`} className="group relative rounded-xl overflow-hidden border border-[#3A3E42] bg-[#171A1C] min-h-[240px] lg:min-h-[340px] flex items-center justify-center">
              <span className="absolute top-4 left-4 z-10 bg-[#FDC700] text-[#1A1A1A] text-[10px] font-extrabold tracking-[1px] px-3 py-1.5 rounded">
                EN CE MOMENT
              </span>
              {heroProduct.image_urls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroProduct.image_urls[0]}
                  alt={heroProduct.name}
                  className="w-full h-full min-h-[240px] lg:min-h-[340px] object-contain p-8 transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <Laptop size={88} strokeWidth={1} className="text-[#3E4247]" />
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-[17px] tracking-[1px] text-[#EEF2F7] line-clamp-1">{heroProduct.name}</p>
                  <p className="text-[11.5px] text-[#B3B8BE] mt-1">Voir la fiche produit</p>
                </div>
                <p className="font-display text-[21px] text-[#FDC700] whitespace-nowrap tabular-nums">
                  {formatAmount(heroProduct.price_fcfa)} FCFA
                </p>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-[#3A3E42] bg-[#171A1C] min-h-[240px] flex flex-col items-center justify-center text-center p-8">
              <Laptop size={44} strokeWidth={1} className="text-[#3E4247] mb-4" />
              <p className="font-display text-[15px] tracking-[1px] text-[#B3B8BE]">CATALOGUE EN PRÉPARATION</p>
              <p className="text-[12px] text-[#6F767E] mt-2 max-w-xs">
                Les premiers produits seront mis en ligne très prochainement.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Gammes : prix « à partir de » calculé sur les vrais produits en ligne */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-11">
        <div className="text-center mb-7">
          <h2 className="font-display text-[21px] sm:text-[25px] tracking-[1px] text-[#EEF2F7] mb-2">CHOISISSEZ VOTRE GAMME</h2>
          <p className="text-[13px] text-[#8E959D]">Quatre familles, un même niveau d&apos;exigence sur la sélection.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {gammes.map(({ cat, min, count }) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.value}
                href={`/products?category=${cat.value}`}
                className="group relative bg-[#1C2021] border border-[#35383C] hover:border-[#4E5257] rounded-xl p-5 text-center overflow-hidden transition-colors"
              >
                <span className="absolute inset-x-0 top-0 h-[3px] bg-[#FDC700]" />
                <span className="w-12 h-12 mx-auto mt-1.5 mb-3.5 rounded-xl bg-[#2A2D31] border border-[#3E4247] flex items-center justify-center text-[#FDC700]">
                  <Icon size={21} strokeWidth={1.7} />
                </span>
                <h3 className="font-display text-[15px] tracking-[1px] text-[#EEF2F7] mb-1.5">{cat.short.toUpperCase()}</h3>
                <p className="text-[11.5px] text-[#8E959D] leading-[1.5] min-h-[34px]">{GAMME_PITCH[cat.value]}</p>
                {min !== null ? (
                  <p className="text-[11px] text-[#B3B8BE] mt-3">
                    À partir de
                    <span className="block font-display text-[15px] text-[#FDC700] tabular-nums mt-0.5">
                      {formatAmount(min)} FCFA
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#6F767E] mt-3 min-h-[38px] flex items-center justify-center">Bientôt disponible</p>
                )}
                <span className="block mt-3 text-[11.5px] font-bold text-[#FDC700] group-hover:underline">
                  {count > 0 ? 'Découvrir →' : 'Nous prévenir →'}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Meilleures ventes */}
      {loading ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
          <h2 className="font-display text-[19px] sm:text-[22px] tracking-[1px] text-[#EEF2F7] mb-5">NOS MEILLEURES VENTES</h2>
          <GridSkeleton />
        </section>
      ) : (
        <ProductSection title="NOS MEILLEURES VENTES" products={popular} href="/products?sort=popular" />
      )}

      {/* Rayons les plus fournis : un rayon vide ne s'affiche pas */}
      {topCategories.map(({ cat, items }) => (
        <ProductSection
          key={cat.value}
          title={cat.label.toUpperCase()}
          products={items}
          href={`/products?category=${cat.value}`}
        />
      ))}

      {deals.length > 0 && (
        <ProductSection title="LES MEILLEURES OFFRES" products={deals} href="/products" />
      )}

      {/* Accessoires */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
        <div className="bg-gradient-to-r from-[#1C2021] to-[#2A2118] border border-[#4A4126] rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            <h3 className="font-display text-[19px] sm:text-[21px] tracking-[1px] text-[#EEF2F7] mb-2">COMPLÉTEZ VOTRE ÉQUIPEMENT</h3>
            <p className="text-[13px] text-[#B3B8BE] leading-[1.6] max-w-lg mb-4">
              Claviers, souris, casques, sacoches, câbles et adaptateurs. Tout ce qu&apos;il faut autour de votre machine, au même endroit.
            </p>
            <Link href="/products?category=accessoire" className="inline-block px-6 py-3 bg-[#FDC700] hover:bg-[#E0B000] text-[#1A1A1A] rounded-lg font-bold text-[13px] transition-colors">
              Voir les accessoires
            </Link>
          </div>
          <div className="flex gap-2.5 lg:ml-auto flex-shrink-0">
            {[Keyboard, Mouse, Headphones, HardDrive].map((Icon, i) => (
              <span key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#2A2D31] border border-[#45484C] flex items-center justify-center text-[#FDC700]">
                <Icon size={21} strokeWidth={1.7} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi CACAO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
        <div className="text-center mb-7">
          <h2 className="font-display text-[21px] sm:text-[25px] tracking-[1px] text-[#EEF2F7]">POURQUOI CACAO ?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { icon: CreditCard, t: 'Paiement sécurisé', p: 'Wave, Orange Money, MTN, Moov ou carte bancaire, traité par MoneyFusion.' },
            { icon: Truck, t: 'Livraison suivie', p: 'Un code vous est demandé à la remise du colis. C’est votre garantie de réception.' },
            { icon: RotateCcw, t: 'Retour 14 jours', p: 'Si la machine ne correspond pas à votre usage, elle vous est reprise.' },
            { icon: Headphones, t: 'Conseil avant achat', p: 'Une question sur une configuration ? On répond avant que vous commandiez.' }
          ].map(({ icon: Icon, t, p }) => (
            <div key={t} className="bg-[#1C2021] border border-[#35383C] rounded-xl p-5">
              <span className="w-9 h-9 rounded-lg bg-[#FDC700]/12 text-[#FDC700] flex items-center justify-center mb-3">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <h4 className="text-[13px] font-bold text-[#EEF2F7] mb-1.5">{t}</h4>
              <p className="text-[11.5px] text-[#8E959D] leading-[1.55]">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-14">
        <div className="bg-[#1C2021] border border-[#35383C] rounded-xl p-7 sm:p-9 text-center">
          <h2 className="font-display text-[19px] sm:text-[22px] tracking-[1px] text-[#EEF2F7] mb-2">NE MANQUEZ AUCUNE OFFRE</h2>
          <p className="text-[13px] text-[#8E959D] mb-6 max-w-md mx-auto">
            Recevez les nouveautés et les bonnes affaires CACAO.
          </p>
          {newsletterStatus === 'success' ? (
            <p className="text-[#3FCE7A] font-bold text-sm">✓ Merci, vous êtes inscrit(e) !</p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex items-center justify-center gap-2.5 max-w-md mx-auto flex-wrap">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="flex-1 min-w-[200px] px-4 py-3 bg-[#2A2D31] border border-[#3E4247] focus:border-[#FDC700] rounded-lg text-[13px] text-[#EEF2F7] outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-3 bg-[#FDC700] hover:bg-[#E0B000] text-[#1A1A1A] rounded-lg font-bold text-[13px] transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {newsletterStatus === 'loading' ? 'Envoi…' : 'S’abonner'}
              </button>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-[#F87171] text-[12.5px] mt-3">Une erreur est survenue, réessayez.</p>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
