import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { PromoCarousel } from '@/components/PromoCarousel'
import { NewsletterForm } from '@/components/NewsletterForm'
import { ScrollRow } from '@/components/ScrollRow'
import {
  btn, categoryAccent, TITLE_SECTION, TITLE_CARD, SCROLL_ROW, SCROLL_CARD,
  LINK_FRAMED, LINK_FRAMED_ARROW,
} from '@/lib/ui'
import { HERO_SETTING_KEYS, parseHeroSettings, type PromoSlide } from '@/lib/hero'
import {
  MapPin, ShieldCheck, Truck, RotateCcw, Headphones,
  Keyboard, Mouse, HardDrive, CreditCard, ArrowRight, TrendingUp
} from 'lucide-react'
import { FALLBACK_CATEGORIES, categoryIcon, type CategoryDef } from '@/lib/categories'
import { fetchCatalog, fetchCategoryRows, fetchHero, type CatalogProduct } from '@/lib/catalog.server'
import { formatAmount } from '@/lib/format'

/**
 * La page est rendue sur le serveur, produits compris.
 *
 * Elle était entièrement construite dans le navigateur : le visiteur voyait
 * d'abord des cadres gris, puis la page se réorganisait sous ses yeux à mesure
 * que les produits, les rayons et le bandeau arrivaient. Trois allers retours
 * réseau avant le premier contenu utile, et autant de sauts de mise en page.
 *
 * Ici tout est lu en une fois, avant l'envoi. Le visiteur reçoit une page déjà
 * complète. Seuls deux blocs restent interactifs — le carrousel et le
 * formulaire d'inscription — et ils sont isolés dans leurs propres composants.
 */

type Product = CatalogProduct

/** Rafraîchi au plus toutes les cinq minutes : un catalogue ne bouge pas à la seconde. */
export const revalidate = 300

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

/* Le squelette de chargement qui figurait ici n'a plus d'objet : la page
   arrive avec ses produits. C'est lui que le visiteur voyait clignoter avant
   que la mise en page ne se réorganise. */

function ProductSection({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (products.length === 0) return null
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8 sm:pb-10">
      {/* Titre à gauche, bouton à droite, tous deux centrés sur la même ligne.
          Le cadre reste sobre — contour fin, fond transparent. Seule la flèche
          porte la couleur commerciale : elle suffit à signaler qu'on peut aller
          plus loin, sans transformer le lien en bouton coloré. */}
      {/* Sur téléphone, le titre et le bouton s'empilent ; côte à côte, ils se
          disputaient une largeur qu'ils n'ont pas, et le titre était rogné au
          point de ne plus rien nommer : « NOS MEILLEUR… ». Un titre tronqué
          n'informe de rien, alors qu'une ligne de plus ne coûte que sa hauteur.
          Dès la tablette, la mise côte à côte reprend : la place existe. */}
      <div className="mb-8 sm:mb-12 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center min-w-0">
          {/* Petite icône d'accent avant le titre : elle donne un point
              d'entrée à la ligne sans ajouter un seul mot. */}
          <TrendingUp
            size={22}
            strokeWidth={2}
            className="text-accent mr-2 sm:mr-3 flex-shrink-0"
            aria-hidden="true"
          />
          <h2 className={`${TITLE_SECTION} sm:truncate`}>{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            /* Pleine largeur sur téléphone : la cible est alors franche et le
               libellé entier, au lieu d'une pastille serrée contre le bord. */
            className={`${LINK_FRAMED} mt-3.5 flex w-full justify-center sm:mt-0 sm:inline-flex sm:w-auto sm:flex-shrink-0`}
          >
            Voir tout
            <ArrowRight size={15} strokeWidth={2} className={LINK_FRAMED_ARROW} />
          </Link>
        )}
      </div>
      {/* Trois colonnes et non quatre : les cartes gagnent en largeur, la photo
          du produit devient lisible et le nom cesse d'être tronqué. */}
      <ScrollRow count={products.length} className="gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
        {products.map(p => (
          <div key={p.id} className={SCROLL_CARD}>
            <ProductCard {...p} />
          </div>
        ))}
      </ScrollRow>
    </section>
  )
}

/**
 * Toutes les lectures en une seule fois, en parallèle.
 *
 * Chaque source tombe sur un repli plutôt que de faire échouer la page : une
 * table absente parce qu'une migration n'a pas été exécutée doit priver la page
 * de ce bloc là, pas de tout le reste.
 */
async function loadHome() {
  const [productsResult, categoryRows, hero] = await Promise.all([
    fetchCatalog().catch(err => {
      console.error('Accueil : lecture du catalogue impossible.', err)
      return [] as Product[]
    }),
    fetchCategoryRows().catch(() => null),
    fetchHero(HERO_SETTING_KEYS).catch(err => {
      console.error('Accueil : lecture du bandeau impossible.', err)
      return { settings: null, slides: [] as PromoSlide[] }
    }),
  ])

  const categories: CategoryDef[] = (categoryRows || []).length
    ? categoryRows!.map(row => ({
        value: row.value,
        label: row.label,
        short: row.short_label || row.label,
        icon: categoryIcon(row.icon),
        description: row.description,
        tagline: row.tagline,
        imageUrl: row.image_url,
        isVisible: row.is_visible,
      }))
    : FALLBACK_CATEGORIES

  return {
    products: productsResult,
    categories: categories.filter(c => c.isVisible !== false),
    heroSettings: parseHeroSettings(hero.settings),
    slides: hero.slides as PromoSlide[],
  }
}

export default async function Home() {
  const { products, categories, heroSettings, slides } = await loadHome()

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
      {/*
        Mode grande bannière : quand le texte d'accroche est coupé, le bandeau
        sort du conteneur et occupe toute la largeur de l'écran.

        C'est la disposition du site de référence, dont la bannière d'ouverture
        est en pleine largeur avec un rapport de 2000 sur 700. Enfermée dans un
        conteneur de 1280 px, la même image perdait précisément ce qui en fait
        une bannière : le fait qu'elle touche les deux bords.
      */}
      {!showHeroText && showCarousel && (
        <section className="border-b border-border">
          <PromoCarousel
            slides={slides}
            intervalMs={heroSettings.intervalMs}
            /* 45 % de la hauteur d'écran, c'était près de la moitié du premier
               regard occupée par la seule bannière : il fallait faire défiler
               avant d'apercevoir le moindre produit. Ramenée à 260 px, elle
               reste largement visible et laisse la page commencer.
               L'image est recadrée à cette taille plutôt que réduite, sinon
               elle redeviendrait une bande illisible. */
            bleed
            className="w-full h-[260px] md:h-auto md:aspect-[2000/700]"
          />
        </section>
      )}

      {showHeroText && (
      <section className="border-b border-border bg-gradient-to-b from-bg-panel to-bg">
        <div
          className={`max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 gap-8 items-stretch ${
            showCarousel ? 'lg:grid-cols-[355px,1fr]' : 'lg:grid-cols-1'
          }`}
        >
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
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
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
        <ScrollRow count={gammes.length} className="gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
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

            const base = `${SCROLL_CARD} rounded-xl overflow-hidden border flex flex-col transition-colors`

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
        </ScrollRow>
      </section>

      {/* Meilleures ventes, une section par famille, trois modèles chacune.
          Plus de squelette de chargement : les produits sont déjà là quand la
          page arrive. Un rayon sans produit n'apparaît pas, une rangée vide
          ferait croire à une panne d'affichage. */}
      {bestSellersByFamily.map(({ cat, items }) => (
        <ProductSection
          key={cat.value}
          title={`NOS MEILLEURES VENTES ${cat.short.toUpperCase()}`}
          products={items}
          href={`/products?category=${cat.value}&sort=popular`}
        />
      ))}

      {deals.length > 0 && (
        <ProductSection title="LES MEILLEURES OFFRES" products={deals} href="/products" />
      )}

      {/* Accessoires */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8 sm:pb-10">
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
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8 sm:pb-10">
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
          <NewsletterForm />
        </div>
      </section>

      <Footer />
    </main>
  )
}
