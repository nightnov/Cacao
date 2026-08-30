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
import { useCategories } from '@/hooks/useCategories'
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
  colors?: { value: string; image_url: string | null }[]
}

/** Gammes mises en avant. Le prix « à partir de » est calculé sur les vrais produits. */
/**
 * Nombre de gammes présentées en bloc sur l'accueil. Ce sont les premières de
 * l'ordre défini dans l'administration, et non une liste figée qui pouvait
 * pointer vers un rayon supprimé.
 */
const GAMMES_COUNT = 4
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
        <div key={i} className="animate-pulse bg-bg-panel border border-border rounded-xl overflow-hidden">
          <div className="h-[132px] sm:h-[158px] bg-bg-sunken" />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 bg-bg-raised rounded w-4/5" />
            <div className="h-3 bg-bg-raised rounded w-3/5" />
            <div className="h-4 bg-bg-raised rounded w-2/5 mt-3" />
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
        <h2 className="font-display text-[19px] sm:text-[22px] text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-[12.5px] font-bold text-gold hover:underline whitespace-nowrap">
            Voir tout →
          </Link>
        )}
      </div>
      {/* Trois colonnes et non quatre : les cartes gagnent en largeur, la photo
          du produit devient lisible et le nom cesse d'être tronqué. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map(p => <ProductCard key={p.id} {...p} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const categories = useCategories()
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

  // Rayons les plus fournis. Un rayon dont tous les produits figurent déjà
  // dans « meilleures ventes » est masqué : sur un petit catalogue, il
  // affichait exactement la même grille juste en dessous.
  /**
   * Meilleures ventes découpées par famille, trois modèles chacune.
   *
   * Le classement suit `popular`, trié par nombre de vues : on garde donc l'ordre
   * de popularité à l'intérieur de chaque rayon plutôt que l'ordre du catalogue.
   *
   * Un rayon sans produit est écarté : afficher un titre suivi du vide donnerait
   * l'impression d'un affichage cassé.
   */
  const popularRank = new Map(popular.map((p, i) => [p.id, i]))
  const bestSellersByFamily = categories
    .map(cat => ({
      cat,
      items: products
        .filter(p => p.category === cat.value)
        .sort(
          (a, b) =>
            (popularRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (popularRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
        .slice(0, 3),
    }))
    .filter(({ items }) => items.length > 0)

  const gammes = categories.slice(0, GAMMES_COUNT).map(cat => {
    const items = products.filter(p => p.category === cat.value)
    const min = items.length > 0 ? Math.min(...items.map(p => p.price_fcfa)) : null
    return { cat, min, count: items.length }
  })

  return (
    <main className="min-h-screen bg-bg">
      <Navbar />
      <TrustBar />

      {/* Hero : texte à gauche, grande vitrine promotionnelle à droite */}
      <section className="border-b border-border bg-gradient-to-b from-bg-panel to-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[355px,1fr] gap-7 items-stretch">
          <div className="flex flex-col justify-center">
            <span className="inline-flex self-start items-center gap-2 border border-gold/40 text-gold text-[10px] font-bold tracking-[0.6px] px-3 py-1.5 rounded-full mb-4">
              <MapPin size={12} strokeWidth={2} /> LIVRAISON PARTOUT EN CÔTE D&apos;IVOIRE
            </span>
            <h1 className="font-display text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.06] text-ink mb-3">
              LA PERFORMANCE,<br />SANS <span className="text-gold">COMPROMIS.</span>
            </h1>
            <p className="text-[13.5px] text-ink-dim leading-[1.65] mb-6">
              Ordinateurs portables, bureau et gaming. Commandez en ligne, payez en mobile money, recevez chez vous.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <Link href="/products" className="px-6 py-3 bg-gold hover:bg-gold-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors active:scale-[0.98]">
                Voir le catalogue
              </Link>
              <Link href="/products?category=accessoire" className="px-6 py-3 border border-border-strong hover:border-gold text-ink rounded-lg font-bold text-[13px] transition-colors active:scale-[0.98]">
                Nos accessoires
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 sm:gap-6 mt-7 pt-5 border-t border-border">
              {[
                { icon: ShieldCheck, t: 'Paiement sécurisé', s: 'Mobile money ou carte' },
                { icon: Truck, t: 'Moins de 5 jours', s: 'Livraison suivie' },
                { icon: RotateCcw, t: 'Retour 14 jours', s: 'Sans justification' }
              ].map(({ icon: Icon, t, s }) => (
                <div key={t} className="flex gap-2.5 items-start">
                  <Icon size={17} strokeWidth={1.9} className="text-gold flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-[12px] font-bold text-ink">{t}</span>
                    <span className="block text-[10.5px] text-ink-dimmer">{s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vitrine : bannière définie dans l'admin, sinon le produit le plus consulté */}
          {/* Hauteur FIXE et non min-height : avec `w-full` + `object-contain`,
              une image sans hauteur imposée se dimensionne sur son ratio et
              atteignait 805 px, entraînant toute la section avec elle. */}
          {bannerUrl ? (
            <Link href="/products" className="group relative rounded-xl overflow-hidden border border-border-mid bg-bg-sunken h-[220px] sm:h-[280px] lg:h-[330px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Offre en cours" className="w-full h-full object-cover" />
              <span className="absolute top-4 left-4 bg-gold text-ink-invert text-[10px] font-extrabold px-3 py-1.5 rounded">
                EN CE MOMENT
              </span>
            </Link>
          ) : heroProduct ? (
            <Link
              href={`/products/${heroProduct.slug}`}
              className="group relative rounded-xl overflow-hidden border border-border-mid bg-bg-sunken h-[220px] sm:h-[280px] lg:h-[330px] flex items-center justify-center"
            >
              <span className="absolute top-4 left-4 z-10 bg-gold text-ink-invert text-[10px] font-extrabold px-3 py-1.5 rounded">
                EN CE MOMENT
              </span>
              {heroProduct.image_urls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroProduct.image_urls[0]}
                  alt={heroProduct.name}
                  className="max-w-full max-h-full object-contain p-6 pb-16 transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <Laptop size={80} strokeWidth={1} className="text-border-mid" />
              )}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-[15px] text-ink line-clamp-1">{heroProduct.name}</p>
                  <p className="text-[11px] text-ink-dim mt-0.5">Voir la fiche produit</p>
                </div>
                <p className="font-display text-[19px] text-gold whitespace-nowrap tabular-nums flex-shrink-0">
                  {formatAmount(heroProduct.price_fcfa)} FCFA
                </p>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-border-mid bg-bg-sunken h-[220px] lg:h-[330px] flex flex-col items-center justify-center text-center p-8">
              <Laptop size={44} strokeWidth={1} className="text-border-mid mb-4" />
              <p className="font-display text-[15px] text-ink-dim">CATALOGUE EN PRÉPARATION</p>
              <p className="text-[12px] text-ink-faint mt-2 max-w-xs">
                Les premiers produits seront mis en ligne très prochainement.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Gammes : prix « à partir de » calculé sur les vrais produits en ligne */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-11">
        <div className="text-center mb-9">
          <h2 className="font-display text-[25px] sm:text-[30px] text-ink mb-2.5">
            CHOISISSEZ VOTRE GAMME
          </h2>
          <p className="text-[15px] text-ink-dimmer">
            Quatre familles, un même niveau d&apos;exigence sur la sélection.
          </p>
        </div>
        {/* Cartes hautes avec visuel : une photo de machine dit en un coup
            d'œil ce que contient le rayon, là où quatre icônes de trait se
            ressemblaient toutes. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {gammes.map(({ cat, min, count }) => {
            const Icon = cat.icon
            const empty = count === 0

            const inner = (
              <>
                {/* Format carré et image quasi bord à bord, comme sur la
                    référence : la machine occupe le cadre au lieu de flotter
                    au milieu d'une marge. */}
                <div className="relative aspect-square bg-bg-sunken overflow-hidden">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.label}
                      loading="lazy"
                      /* `contain` et non `cover` : une machine recadrée perd
                         justement ce qui permet de la reconnaître. */
                      className={`w-full h-full object-contain p-2.5 transition-transform duration-300 ${
                        empty ? 'opacity-45' : 'group-hover:scale-[1.04]'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        empty ? 'text-ink-faint' : 'text-border-strong'
                      }`}
                    >
                      <Icon size={64} strokeWidth={1} />
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3
                    className={`font-display text-[21px] leading-tight mb-2 ${empty ? 'text-ink-dimmer' : 'text-ink'}`}
                  >
                    {cat.short.toUpperCase()}
                  </h3>
                  <p className="text-[14px] text-ink-dimmer leading-[1.5] min-h-[42px]">
                    {cat.tagline || GAMME_PITCH[cat.value] || ''}
                  </p>

                  {min !== null ? (
                    <>
                      <p className="text-[14px] text-ink-dim mt-5">
                        À partir de{' '}
                        <span className="font-display text-[18px] text-gold tabular-nums">
                          {formatAmount(min)} FCFA
                        </span>
                      </p>
                      <span className="mt-5 block text-center bg-gold text-ink-invert font-bold text-[14.5px] rounded-lg py-3.5 group-hover:bg-gold-dim transition-colors">
                        Découvrir {cat.short}
                      </span>
                    </>
                  ) : (
                    /* Aucun produit dans ce rayon : la carte n'est pas
                       cliquable et n'annonce rien qui n'existe pas. */
                    <span className="mt-auto pt-5 block text-center border border-border-mid text-ink-faint text-[14px] rounded-lg py-3.5">
                      Bientôt disponible
                    </span>
                  )}
                </div>
              </>
            )

            const base = 'rounded-xl overflow-hidden border flex flex-col transition-colors'

            return empty ? (
              <div key={cat.value} className={`${base} bg-bg-panel/60 border-border cursor-default`}>
                {inner}
              </div>
            ) : (
              <Link
                key={cat.value}
                href={`/products?category=${cat.value}`}
                className={`group ${base} bg-bg-panel border-border hover:border-gold`}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Meilleures ventes */}
      {loading ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
          <h2 className="font-display text-[19px] sm:text-[22px] text-ink mb-5">NOS MEILLEURES VENTES</h2>
          <GridSkeleton />
        </section>
      ) : (
        /* Une section de meilleures ventes par famille, trois modèles chacune.
           Un rayon sans produit n'apparaît pas : une rangée vide ferait croire
           à une panne d'affichage. */
        bestSellersByFamily.map(({ cat, items }) => (
          <ProductSection
            key={cat.value}
            title={`NOS MEILLEURES VENTES ${cat.short.toUpperCase()}`}
            products={items}
            href={`/products?category=${cat.value}&sort=popular`}
          />
        ))
      )}

      {deals.length > 0 && (
        <ProductSection title="LES MEILLEURES OFFRES" products={deals} href="/products" />
      )}

      {/* Accessoires */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
        <div className="bg-gradient-to-r from-bg-panel to-gold/5 border border-gold/25 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            <h3 className="font-display text-[19px] sm:text-[21px] text-ink mb-2">COMPLÉTEZ VOTRE ÉQUIPEMENT</h3>
            <p className="text-[13px] text-ink-dim leading-[1.6] max-w-lg mb-4">
              Claviers, souris, casques, sacoches, câbles et adaptateurs. Tout ce qu&apos;il faut autour de votre machine, au même endroit.
            </p>
            <Link href="/products?category=accessoire" className="inline-block px-6 py-3 bg-gold hover:bg-gold-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors">
              Voir les accessoires
            </Link>
          </div>
          <div className="flex gap-2.5 lg:ml-auto flex-shrink-0">
            {[Keyboard, Mouse, Headphones, HardDrive].map((Icon, i) => (
              <span key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-bg-raised border border-border-strong flex items-center justify-center text-gold">
                <Icon size={21} strokeWidth={1.7} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi CACAO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-11">
        <div className="text-center mb-7">
          <h2 className="font-display text-[21px] sm:text-[25px] text-ink">POURQUOI CACAO ?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { icon: CreditCard, t: 'Paiement sécurisé', p: 'Wave, Orange Money, MTN, Moov ou carte bancaire, traité par MoneyFusion.' },
            { icon: Truck, t: 'Livraison suivie', p: 'Un code vous est demandé à la remise du colis. C’est votre garantie de réception.' },
            { icon: RotateCcw, t: 'Retour 14 jours', p: 'Si la machine ne correspond pas à votre usage, elle vous est reprise.' },
            { icon: Headphones, t: 'Conseil avant achat', p: 'Une question sur une configuration ? On répond avant que vous commandiez.' }
          ].map(({ icon: Icon, t, p }) => (
            <div key={t} className="bg-bg-panel border border-border rounded-xl p-5">
              <span className="w-9 h-9 rounded-lg bg-gold/12 text-gold flex items-center justify-center mb-3">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <h4 className="text-[13px] font-bold text-ink mb-1.5">{t}</h4>
              <p className="text-[11.5px] text-ink-dimmer leading-[1.55]">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-14">
        <div className="bg-bg-panel border border-border rounded-xl p-7 sm:p-9 text-center">
          <h2 className="font-display text-[19px] sm:text-[22px] text-ink mb-2">NE MANQUEZ AUCUNE OFFRE</h2>
          <p className="text-[13px] text-ink-dimmer mb-6 max-w-md mx-auto">
            Recevez les nouveautés et les bonnes affaires CACAO.
          </p>
          {newsletterStatus === 'success' ? (
            <p className="text-green-bright font-bold text-sm">✓ Merci, vous êtes inscrit(e) !</p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex items-center justify-center gap-2.5 max-w-md mx-auto flex-wrap">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="flex-1 min-w-[200px] px-4 py-3 bg-bg-raised border border-border-mid focus:border-gold rounded-lg text-[13px] text-ink outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-3 bg-gold hover:bg-gold-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {newsletterStatus === 'loading' ? 'Envoi…' : 'S’abonner'}
              </button>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-danger text-[12.5px] mt-3">Une erreur est survenue, réessayez.</p>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
