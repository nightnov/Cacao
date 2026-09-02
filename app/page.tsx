'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { PromoCarousel } from '@/components/PromoCarousel'
import { getSupabaseClient } from '@/lib/supabase'
import { btn, categoryAccent, TITLE_SECTION, TITLE_CARD } from '@/lib/ui'
import {
  DEFAULT_HERO_SETTINGS,
  HERO_SETTING_KEYS,
  parseHeroSettings,
  type HeroSettings,
  type PromoSlide,
} from '@/lib/hero'
import {
  MapPin, ShieldCheck, Truck, RotateCcw, Headphones,
  Keyboard, Mouse, HardDrive, CreditCard, ArrowRight, TrendingUp
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
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-11">
      {/* Titre à gauche, bouton à droite, tous deux centrés sur la même ligne.
          Le cadre reste sobre — contour fin, fond transparent. Seule la flèche
          porte la couleur commerciale : elle suffit à signaler qu'on peut aller
          plus loin, sans transformer le lien en bouton coloré. */}
      <div className="flex items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
        <div className="flex items-center min-w-0">
          {/* Petite icône d'accent avant le titre : elle donne un point
              d'entrée à la ligne sans ajouter un seul mot. */}
          <TrendingUp
            size={22}
            strokeWidth={2}
            className="text-accent mr-2 sm:mr-3 flex-shrink-0"
            aria-hidden="true"
          />
          <h2 className={`${TITLE_SECTION} truncate`}>{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            /* Grossi en même temps que le titre : à côté d'un titre de 36 px,
               un libellé de 12,5 px passait pour une note de bas de page
               plutôt que pour une action. */
            className="group/lien inline-flex items-center gap-2 border border-border-strong hover:border-accent/60 text-ink-dim hover:text-ink text-[14px] font-semibold rounded-lg px-5 py-2.5 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Voir tout
            <ArrowRight
              size={15}
              strokeWidth={2}
              className="text-accent transition-transform group-hover/lien:translate-x-0.5"
            />
          </Link>
        )}
      </div>
      {/* Trois colonnes et non quatre : les cartes gagnent en largeur, la photo
          du produit devient lisible et le nom cesse d'être tronqué. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {products.map(p => <ProductCard key={p.id} {...p} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const categories = useCategories()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [slides, setSlides] = useState<PromoSlide[]>([])
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS)
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
    /**
     * Bandeau promotionnel et réglages de la zone d'accueil.
     *
     * En cas d'échec — migration 031 pas encore exécutée, réseau coupé — on
     * garde les valeurs par défaut : le texte s'affiche, le carrousel reste
     * vide. Mieux vaut une accroche seule qu'une page d'accueil amputée.
     */
    const fetchHero = async () => {
      try {
        const supabase = getSupabaseClient()
        const [settingsRes, slidesRes] = await Promise.all([
          supabase.from('site_settings').select('key, value').in('key', HERO_SETTING_KEYS as unknown as string[]),
          supabase
            .from('promo_slides')
            .select('id, image_url, link_url, alt_text, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ])
        setHeroSettings(parseHeroSettings(settingsRes.data))
        setSlides((slidesRes.data as PromoSlide[]) || [])
      } catch (error) {
        console.error('Erreur lors du chargement du bandeau promotionnel:', error)
      }
    }
    fetchProducts()
    fetchHero()
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

  // Le carrousel n'apparaît que s'il a réellement quelque chose à montrer :
  // un cadre vide dans la zone d'accueil ressemble à une image qui n'a pas
  // chargé. Sans image, le texte occupe seul toute la largeur.
  const showCarousel = heroSettings.carouselEnabled && slides.length > 0
  const showHeroText = heroSettings.textEnabled

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
      {/* Pas de barre d'avantages ici : la section « Pourquoi CACAO » reprend
          les mêmes garanties en bas de page, en plus détaillé. Elle reste en
          revanche sur le catalogue, qui n'a pas cette section. */}

      {/*
        Zone d'accueil : deux blocs indépendants, pilotés depuis l'administration.
        Le texte d'accroche et le bandeau promotionnel s'activent séparément —
        couper l'un donne toute la largeur à l'autre, couper les deux fait
        disparaître la zone plutôt que de laisser un cadre vide.
      */}
      {(showHeroText || showCarousel) && (
      <section className="border-b border-border bg-gradient-to-b from-bg-panel to-bg">
        <div
          className={`max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 gap-8 items-stretch ${
            showHeroText && showCarousel ? 'lg:grid-cols-[355px,1fr]' : 'lg:grid-cols-1'
          }`}
        >
          {showHeroText && (
          <div className="flex flex-col justify-center">
            <span className="inline-flex self-start items-center gap-2 border border-border-strong text-ink-dim text-[10px] font-bold tracking-[0.6px] px-3 py-1.5 rounded-full mb-4">
              <MapPin size={12} strokeWidth={2} /> LIVRAISON PARTOUT EN CÔTE D&apos;IVOIRE
            </span>
            <h1 className="font-display text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.06] text-ink mb-3">
              LA PERFORMANCE,<br />SANS COMPROMIS.
            </h1>
            <p className="text-[15.5px] text-ink-dim leading-[1.65] mb-6">
              Ordinateurs portables, bureau et gaming. Commandez en ligne, payez en mobile money, recevez chez vous.
            </p>
            {/* Action principale en clair sur sombre plutôt qu'en doré : elle
                ressort autant, et le doré reste disponible pour ce qui doit
                vraiment alerter. */}
            <div className="flex gap-2.5 flex-wrap">
              {/* Une seule action pleine par écran : elle porte le parcours
                  principal. La seconde reste encadrée, sans aplat. */}
              <Link href="/products" className={btn('solid', 'lg')}>
                Voir le catalogue
              </Link>
              <Link href="/products?category=accessoire" className={btn('sober', 'lg')}>
                Nos accessoires
              </Link>
            </div>

            {/* La rangée d'avantages qui figurait ici répétait mot pour mot la
                barre située juste au-dessus, et la section « Pourquoi CACAO »
                les reprenait une troisième fois. Elle est retirée. */}
          </div>
          )}

          {/*
            Bandeau promotionnel. Rien n'y est ajouté par le code : ni badge,
            ni nom de produit, ni prix, ni dégradé noir. La zone affiche les
            images publiées en administration, et rien d'autre.

            Le repli automatique sur le produit le plus consulté a été retiré :
            il mettait en vitrine un contenu que personne n'avait choisi.

            Hauteur FIXE et non min-height : avec `object-contain`, une image
            sans hauteur imposée se dimensionne sur son ratio et atteignait
            805 px, entraînant toute la section avec elle.
          */}
          {showCarousel && (
            <PromoCarousel
              slides={slides}
              intervalMs={heroSettings.intervalMs}
              className="h-[220px] sm:h-[300px] lg:h-[360px]"
            />
          )}
        </div>
      </section>
      )}

      {/* Gammes : prix « à partir de » calculé sur les vrais produits en ligne */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-11">
        <div className="text-center mb-9">
          <h2 className={`${TITLE_SECTION} mb-3`}>
            CHOISISSEZ VOTRE GAMME
          </h2>
          <p className="text-[15px] text-ink-dim">
            Quatre familles, un même niveau d&apos;exigence sur la sélection.
          </p>
        </div>
        {/* Cartes hautes avec visuel : une photo de machine dit en un coup
            d'œil ce que contient le rayon, là où quatre icônes de trait se
            ressemblaient toutes. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {gammes.map(({ cat, min, count }) => {
            const Icon = cat.icon
            // Teinte du rayon : elle habille le bouton et le montant, rien
            // d'autre. Colorer aussi le cadre et le titre ferait quatre cartes
            // criardes là où on veut quatre familles reconnaissables.
            const accent = categoryAccent(cat.value)
            const empty = count === 0

            const inner = (
              <>
                {/* Aucun fond propre, et hauteur fixe comme sur les cartes
                    produit : les PNG détourés se posent sur la teinte de la
                    carte, sans bande qui la couperait en deux. */}
                <div className="relative h-[210px] sm:h-[240px] overflow-hidden">
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
                    /* Aucune photo chargée : l'icône occupe une bonne part du
                       carré, sinon la zone paraît vide et déséquilibre la
                       carte face à celles qui en ont une. */
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        empty ? 'text-ink-faint' : 'text-border-strong'
                      }`}
                    >
                      <Icon size={88} strokeWidth={0.9} />
                    </div>
                  )}
                </div>

                {/* Chaque bloc occupe la même hauteur d'une carte à l'autre :
                    titre, accroche sur deux lignes réservées, emplacement de
                    prix conservé même vide, bouton collé en bas. Sans ces
                    hauteurs fixes, une carte sans prix remontait son bouton et
                    la rangée perdait son alignement. */}
                <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
                  <h3
                    className={`font-display font-medium text-[20px] leading-[1.25] mb-2 ${empty ? 'text-ink-dimmer' : 'text-ink'}`}
                  >
                    {cat.short.toUpperCase()}
                  </h3>

                  <p className="text-[15px] text-ink-dim leading-[1.5] min-h-[45px]">
                    {cat.tagline || GAMME_PITCH[cat.value] || ''}
                  </p>

                  <div className="mt-auto pt-4">
                    {/* Prix discret dans cette section : c'est un repère de
                        gamme, pas une offre. La mise en avant du montant
                        appartient aux vrais produits, plus bas. */}
                    {/* Seul le montant prend la teinte du rayon ; la mention
                        « À partir de » reste grise. C'est le chiffre qu'on
                        cherche, pas la formule qui l'introduit. */}
                    <p className="text-[13px] text-ink-dimmer min-h-[20px] tabular-nums">
                      {min !== null && (
                        <>
                          À partir de{' '}
                          <span className={`font-semibold ${accent.text}`}>
                            {formatAmount(min)} FCFA
                          </span>
                        </>
                      )}
                    </p>

                    {min !== null ? (
                      /* Le bouton de gamme porte la couleur du rayon : c'est
                         le seul endroit de la carte où elle s'affiche en aplat,
                         et elle suffit à distinguer les quatre familles.
                         La bordure de même teinte est invisible, mais donne au
                         bouton exactement la même hauteur qu'à « Bientôt
                         disponible », qui en a une. Sans elle, les boutons se
                         décalaient de deux pixels d'une carte à l'autre. */
                      <span className={`mt-3 block text-center ${accent.bg} border border-transparent text-ink-invert font-bold text-[14px] rounded-lg py-3 transition-opacity group-hover:opacity-90`}>
                        Découvrir {cat.short}
                      </span>
                    ) : (
                      /* Aucun produit dans ce rayon : la carte n'est pas
                         cliquable et n'annonce rien qui n'existe pas. */
                      <span className="mt-3 block text-center border border-border-mid text-ink-faint text-[14px] rounded-lg py-3">
                        Bientôt disponible
                      </span>
                    )}
                  </div>
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
                className={`group ${base} bg-bg-panel border-border hover:border-border-strong`}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Meilleures ventes */}
      {loading ? (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-11">
          <h2 className={`${TITLE_SECTION} mb-8 sm:mb-12`}>NOS MEILLEURES VENTES</h2>
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
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-11">
        <div className="bg-gradient-to-r from-bg-panel to-bg-raised border border-border rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            <h3 className="font-display text-[19px] sm:text-[21px] text-ink mb-2">COMPLÉTEZ VOTRE ÉQUIPEMENT</h3>
            <p className="text-[13px] text-ink-dim leading-[1.6] max-w-lg mb-4">
              Claviers, souris, casques, sacoches, câbles et adaptateurs. Tout ce qu&apos;il faut autour de votre machine, au même endroit.
            </p>
            <Link href="/products?category=accessoire" className="inline-block px-6 py-3 bg-ink hover:bg-ink-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors">
              Voir les accessoires
            </Link>
          </div>
          <div className="flex gap-2.5 lg:ml-auto flex-shrink-0">
            {[Keyboard, Mouse, Headphones, HardDrive].map((Icon, i) => (
              <span key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-bg-raised border border-border-strong flex items-center justify-center text-ink-dim">
                <Icon size={21} strokeWidth={1.7} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi CACAO */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-11">
        <div className="text-center mb-7">
          <h2 className={TITLE_SECTION}>POURQUOI CACAO ?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { icon: CreditCard, t: 'Paiement sécurisé', p: 'Wave, Orange Money, MTN, Moov ou carte bancaire, traité par MoneyFusion.' },
            { icon: Truck, t: 'Livraison suivie', p: 'Un code vous est demandé à la remise du colis. C’est votre garantie de réception.' },
            { icon: RotateCcw, t: 'Retour 14 jours', p: 'Si la machine ne correspond pas à votre usage, elle vous est reprise.' },
            { icon: Headphones, t: 'Conseil avant achat', p: 'Une question sur une configuration ? On répond avant que vous commandiez.' }
          ].map(({ icon: Icon, t, p }) => (
            <div key={t} className="bg-bg-panel border border-border rounded-xl p-5">
              <span className="w-9 h-9 rounded-lg bg-accent/12 border border-accent/25 text-accent flex items-center justify-center mb-3">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <h4 className="text-[13px] font-bold text-ink mb-1.5">{t}</h4>
              <p className="text-[12px] text-ink-dim leading-[1.55]">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-bg-panel border border-border rounded-xl p-7 sm:p-9 text-center">
          <h2 className={`${TITLE_SECTION} mb-3`}>NE MANQUEZ AUCUNE OFFRE</h2>
          <p className="text-[14px] text-ink-dim mb-6 max-w-md mx-auto">
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
                className="flex-1 min-w-[200px] px-4 py-3 bg-bg-raised border border-border-mid focus:border-border-strong rounded-lg text-[13px] text-ink outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-3 bg-ink hover:bg-ink-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
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
