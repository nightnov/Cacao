'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Button } from '@/components/Button'
import { ProductCard } from '@/components/ProductCard'
import { FavoriteButton } from '@/components/FavoriteButton'
import { componentIcon, componentTypeLabel, sanitizeComponents } from '@/lib/components'
import { SoldByBlock } from '@/components/SoldByBlock'
import { StarRating } from '@/components/StarRating'
import { getSupabaseClient } from '@/lib/supabase'
import { addToCart } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
  Star,
  ShieldCheck,
  RotateCcw,
  Truck,
  CreditCard,
  ChevronRight,
  ArrowRight,
  MessageCircle,
} from 'lucide-react'
import { VariantOption, ProductVariant } from '@/types/admin'
import { findMatchingVariant, variantLabel } from '@/lib/variants'
import { categoryLabel } from '@/lib/categories'
import { formatAmount } from '@/lib/format'
import { PRICE, PRICE_OLD, LINK_FRAMED, LINK_FRAMED_ARROW } from '@/lib/ui'
import { stripDashes } from '@/lib/text'
import { ProductGallery } from '@/components/ProductGallery'
import { ProductConfigurator } from '@/components/ProductConfigurator'
import { ProductDescription } from '@/components/ProductDescription'
import { ConfigSummary } from '@/components/ConfigSummary'
import { BaseConfig } from '@/components/BaseConfig'
import { IncludedItems } from '@/components/IncludedItems'
import {
  buildDescriptionBlocks,
  FALLBACK_GLOSSARY,
  type GlossaryEntry,
} from '@/lib/glossary'
import {
  groupOptions,
  defaultSelection,
  selectedValues,
  selectionIds,
  selectionImage,
  configLabel,
  configuredPrice,
  toggleValue,
  type ProductOption,
  type OptionValue,
  type Selection,
} from '@/lib/options'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  /** Accroche d'une ou deux phrases, affichée sous le nom. */
  short_description?: string | null
  category: string
  price_fcfa: number
  compare_at_price_fcfa: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  /** Ce qui est livré avec l'appareil : chargeur, souris, sacoche, carton. */
  included_items?: string[] | null
  components?: unknown
  tags: string[]
  image_urls: string[]
  video_url: string | null
  variant_options?: VariantOption[]
  seller_id?: string | null
  sellers?: { name: string; created_at?: string } | null
  created_at?: string
}

interface Review {
  id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: { first_name: string | null } | null
}

/* Les libellés des caractéristiques vivaient ici pour un tableau qui n'existe
   plus. Ils sont désormais portés par le glossaire (lib/glossary.ts), au même
   endroit que l'explication de chaque pièce. */

export default function ProductDetail() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, isLoggedIn } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [shared, setShared] = useState(false)

  /** Configuration : options du produit et valeur retenue pour chacune. */
  const [options, setOptions] = useState<ProductOption[]>([])
  const [selection, setSelection] = useState<Selection>({})

  /**
   * Glossaire des composants. Chargé à part du produit pour la même raison que
   * les options : une table absente ne doit pas empêcher la fiche de s'ouvrir.
   */
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(FALLBACK_GLOSSARY)

  /** Vrai si le client a reçu ce produit : condition pour laisser un avis. */
  const [canReview, setCanReview] = useState(false)

  /** Vrai s'il existe au catalogue de quoi compléter un poste de travail. */
  const [hasCompanionProducts, setHasCompanionProducts] = useState(false)
  const [volumeThreshold, setVolumeThreshold] = useState(1_000_000)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient()
        const [companionRes, settingRes] = await Promise.all([
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('category', ['accessoire', 'ecrans'])
            .eq('status', 'active'),
          supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'volume_discount_threshold_fcfa')
            .maybeSingle(),
        ])
        setHasCompanionProducts((companionRes.count || 0) > 0)
        const t = Number(settingRes.data?.value)
        if (Number.isFinite(t) && t > 0) setVolumeThreshold(t)
      } catch {
        // Bloc purement incitatif : en cas d'échec il ne s'affiche pas, ce qui
        // vaut mieux qu'un encart renvoyant vers un rayon vide.
      }
    }
    load()
  }, [])

  /**
   * Droit de laisser un avis : une commande livrée contenant ce produit.
   *
   * La fonction est déclarée `SECURITY DEFINER` en base afin qu'un client
   * puisse vérifier son propre droit sans qu'on lui ouvre la lecture de la
   * table des commandes.
   */
  useEffect(() => {
    if (!product || !user) {
      setCanReview(false)
      return
    }
    let alive = true
    const check = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.rpc('has_delivered_order', {
          p_user: user.id,
          p_product: product.id,
        })
        if (alive) setCanReview(!error && data === true)
      } catch {
        // Migration 034 pas encore exécutée : on reste sur le refus, qui est le
        // choix le plus sûr des deux.
        if (alive) setCanReview(false)
      }
    }
    check()
    return () => {
      alive = false
    }
  }, [product, user])

  const [reviews, setReviews] = useState<Review[]>([])
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const [sellerStats, setSellerStats] = useState<{ avgRating: number; reviewCount: number; productCount: number } | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const supabase = getSupabaseClient()

        /**
         * Trois requêtes de moins en moins exigeantes.
         *
         * Chaque migration non encore exécutée fait échouer la requête entière
         * et affichait « Produit introuvable » — une fiche parfaitement valide
         * devenait inaccessible parce qu'une colonne d'affichage manquait. On
         * retire donc ce qui n'est pas indispensable jusqu'à obtenir une
         * réponse, plutôt que de tout perdre pour un détail.
         */
        const BASE =
          'id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, variant_options'

        // Du plus complet au plus minimal. `short_description` n'existe qu'après
        // la migration 034 : elle est demandée d'abord, puis abandonnée, sans
        // que la fiche cesse de s'afficher.
        const attempts = [
          // `included_items` n'existe qu'après la migration 044 : demandée en
          // premier, abandonnée ensuite, sans que la fiche cesse de s'afficher.
          `${BASE}, short_description, components, included_items, seller_id, sellers(name, created_at)`,
          `${BASE}, short_description, components, seller_id, sellers(name, created_at)`,
          `${BASE}, short_description, components`,
          `${BASE}, components`,
          BASE,
        ]

        let data: any = null
        let error: any = null

        for (const columns of attempts) {
          ;({ data, error } = await supabase
            .from('products')
            .select(columns)
            .eq('slug', slug)
            .eq('status', 'active')
            .maybeSingle())

          // PGRST200 : relation absente. 42703 : colonne absente.
          if (!error || (error.code !== 'PGRST200' && error.code !== '42703')) break
        }

        if (error) throw error

        if (!data) {
          setNotFound(true)
          return
        }

        const typedProduct = data as unknown as Product
        setProduct(typedProduct)
        setQuantity(1)
        setAdded(false)
        setSelectedOptions({})

        supabase.from('product_views').insert([{ product_id: typedProduct.id }]).then(
          () => {},
          () => {}
        )

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('id, user_id, rating, comment, created_at, profiles(first_name)')
          .eq('product_id', typedProduct.id)
          .order('created_at', { ascending: false })
        setReviews((reviewsData as unknown as Review[]) || [])

        /**
         * Configuration du produit.
         *
         * Lue à part du produit : ajouter une jointure à la requête principale
         * ferait échouer toute la fiche tant que la migration 034 n'est pas
         * exécutée, alors qu'un produit sans configuration reste parfaitement
         * consultable. Un échec ici laisse simplement la fiche sans options.
         */
        try {
          const { data: rawOptions, error: optErr } = await supabase
            .from('product_options')
            // `selection_mode` n'existe qu'après la migration 035. En cas
            // d'échec, le bloc `catch` laisse simplement la fiche sans options,
            // et `optionMode` retombe de toute façon sur le choix unique.
            .select('id, product_id, name, sort_order, selection_mode')
            .eq('product_id', typedProduct.id)
            .order('sort_order')

          if (!optErr && rawOptions?.length) {
            const { data: rawValues } = await supabase
              .from('product_option_values')
              .select('*')
              .in('option_id', rawOptions.map(o => o.id))
              .order('sort_order')

            const grouped = groupOptions(rawOptions, (rawValues as OptionValue[]) || [])
            setOptions(grouped)
            setSelection(defaultSelection(grouped))
          } else {
            setOptions([])
            setSelection({})
          }
        } catch {
          setOptions([])
          setSelection({})
        }

        /* Glossaire. Un échec laisse le repli intégré au code plutôt qu'une
           fiche sans aucune explication. */
        try {
          const { data: rawGlossary } = await supabase
            .from('component_glossary')
            .select('key, label, title, body, image_url, icon, sort_order')
            .order('sort_order')
          if (rawGlossary?.length) setGlossary(rawGlossary as GlossaryEntry[])
        } catch {
          /* le repli reste en place */
        }

        if (typedProduct.seller_id) {
          const { data: sellerProducts } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', typedProduct.seller_id)
          const sellerProductIds = (sellerProducts || []).map((p: any) => p.id)

          if (sellerProductIds.length > 0) {
            const { data: ratingsData } = await supabase
              .from('product_ratings')
              .select('avg_rating, review_count')
              .in('product_id', sellerProductIds)

            const rows = ratingsData || []
            const totalReviews = rows.reduce((sum: number, r: any) => sum + (r.review_count || 0), 0)
            const weightedSum = rows.reduce((sum: number, r: any) => sum + (r.avg_rating || 0) * (r.review_count || 0), 0)
            setSellerStats({
              avgRating: totalReviews > 0 ? weightedSum / totalReviews : 0,
              reviewCount: totalReviews,
              productCount: sellerProductIds.length
            })
          } else {
            setSellerStats({ avgRating: 0, reviewCount: 0, productCount: 0 })
          }
        } else {
          setSellerStats(null)
        }

        if (typedProduct.variant_options && typedProduct.variant_options.length > 0) {
          const { data: variantsData } = await supabase
            .from('product_variants')
            .select('id, product_id, option_values, sku, price_fcfa, supplier_cost_fcfa, stock, image_url')
            .eq('product_id', typedProduct.id)
          setVariants((variantsData as unknown as ProductVariant[]) || [])
        } else {
          setVariants([])
        }

        // Le média affiché est désormais géré par la galerie elle-même : elle
        // ouvre sur la première image et suit la configuration choisie.

        const res = await fetch(`/api/products?category=${typedProduct.category}`)
        const categoryProducts: Product[] = await res.json()
        setRelated((categoryProducts || []).filter(p => p.slug !== slug).slice(0, 4))
      } catch (err) {
        console.error('Erreur lors du chargement du produit:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (slug) fetchProduct()
  }, [slug])

  const hasVariants = !!product?.variant_options && product.variant_options.length > 0
  const allOptionsSelected = hasVariants && product!.variant_options!.every(o => selectedOptions[o.name])
  const matchedVariant = allOptionsSelected ? findMatchingVariant(variants, selectedOptions) : undefined

  const handleSelectOption = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }))
  }

  const handleShare = async () => {
    if (!product) return
    const url = `${window.location.origin}/products/${product.slug}`

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url })
        return
      } catch {
        // annulé par l'utilisateur ou non supporté, on retombe sur la copie
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // silencieux: le partage n'est pas critique
    }
  }

  /**
   * Ligne de panier.
   *
   * `price_fcfa` n'est là que pour l'affichage du panier. Ce qui compte pour la
   * facturation, ce sont `option_value_ids` : le serveur relit les suppléments
   * en base à partir d'eux, sans jamais croire le montant venu du navigateur.
   */
  const buildCartItem = () => {
    if (!product) return null
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price_fcfa: displayPrice,
      image_url: configImage || matchedVariant?.image_url || product.image_urls?.[0] || null,
      variant_id: matchedVariant?.id,
      variant_label: matchedVariant ? variantLabel(selectedOptions) : undefined,
      option_value_ids: options.length > 0 ? selectionIds(options, selection) : undefined,
      config_label: options.length > 0 ? configLabel(options, selection) : undefined,
    }
  }

  /** Vrai quand une combinaison de l'ancien modèle reste à choisir. */
  const blockedByLegacyVariant = options.length === 0 && hasVariants && !matchedVariant

  const handleAddToCart = () => {
    if (!product || blockedByLegacyVariant) return
    const item = buildCartItem()
    if (!item) return
    addToCart(item, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product || blockedByLegacyVariant) return
    const item = buildCartItem()
    if (!item) return
    addToCart(item, quantity)
    router.push('/checkout')
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !user || myRating === 0) return

    setSubmittingReview(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('reviews')
        .upsert(
          { product_id: product.id, user_id: user.id, rating: myRating, comment: myComment.trim() || null },
          { onConflict: 'product_id,user_id' }
        )
      if (error) throw error

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, user_id, rating, comment, created_at, profiles(first_name)')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
      setReviews((reviewsData as unknown as Review[]) || [])
      setMyRating(0)
      setMyComment('')
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'avis:', err)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-bg-raised rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-4 bg-bg-raised rounded w-1/4"></div>
              <div className="h-8 bg-bg-raised rounded w-3/4"></div>
              <div className="h-6 bg-bg-raised rounded w-1/3"></div>
              <div className="h-12 bg-bg-raised rounded w-full"></div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (notFound || !product) {
    return (
      <main className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-24 text-center">
          <h1 className="font-serif font-semibold text-3xl text-ink mb-3">Produit introuvable</h1>
          <p className="text-ink-dim mb-8">Ce produit n&apos;existe pas ou n&apos;est plus disponible.</p>
          <Link href="/products">
            <Button variant="sober">Retour au catalogue</Button>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  /**
   * Prix affiché : prix de base augmenté des suppléments de la configuration.
   * Purement indicatif — le montant facturé est recalculé côté serveur.
   */
  const basePrice = matchedVariant ? matchedVariant.price_fcfa : product.price_fcfa
  const displayPrice =
    options.length > 0 ? configuredPrice(basePrice, options, selection) : basePrice

  /** Visuel imposé par la configuration : la couleur choisie, en pratique. */
  const configImage = options.length > 0 ? selectionImage(options, selection) : null

  /**
   * Blocs de la section Description.
   *
   * Ils viennent d'abord de la configuration retenue, puis du glossaire pour
   * toute pièce que la configuration ne couvre pas. Un produit sans aucune
   * option obtient donc quand même ses explications, à partir de ses
   * caractéristiques : c'est justement sur ces fiches là que le client qui
   * découvre l'informatique en a le plus besoin.
   */
  const descriptionBlocks = (() => {
    const optionName = new Map(options.map(o => [o.id, o.name]))
    const configured = (options.length > 0 ? selectedValues(options, selection) : []).map(v => ({
      id: v.id,
      group: optionName.get(v.option_id) || '',
      label: v.label,
      title: v.block_title,
      body: v.block_body,
      imageUrl: v.block_image_url,
    }))
    return buildDescriptionBlocks(glossary, configured, product.specs || {})
  })()

  // Le prix barré n'a de sens que sur la configuration de base : comparé à un
  // prix augmenté d'options, il annoncerait une remise qui n'existe pas.
  const hasPromo =
    !matchedVariant &&
    displayPrice === product.price_fcfa &&
    !!product.compare_at_price_fcfa &&
    product.compare_at_price_fcfa > product.price_fcfa
  const components = sanitizeComponents(product.components)

  // Seules les machines appellent un pack, et seulement si le catalogue a de
  // quoi le composer : proposer « ajouter un écran » sans écran en rayon
  // mènerait à une page vide.
  const canBuildPack =
    ['portable', 'bureau', 'gaming'].includes(product.category) && hasCompanionProducts
  // Avec la configuration par option, toutes les valeurs sont sélectionnées dès
  // l'ouverture : rien ne reste à choisir pour pouvoir commander. Le blocage ne
  // concerne plus que les produits restés sur l'ancien modèle de combinaisons.
  const canAddToCart =
    options.length === 0 && hasVariants
      ? !!matchedVariant && matchedVariant.stock > 0
      : product.availability !== 'discontinued'

  const reviewCount = reviews.length
  const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0
  const myExistingReview = isLoggedIn && user ? reviews.find(r => r.user_id === user.id) : undefined

  /**
   * Le formulaire d'avis n'apparaît qu'après réception du produit.
   *
   * Le contrôle est également posé en base (politique RLS, migration 034) :
   * cacher le formulaire ne suffit pas, la requête d'écriture pourrait être
   * envoyée sans passer par la page. Ici, on évite surtout d'afficher un
   * formulaire qui échouerait au moment de l'envoi.
   *
   * Un client qui a déjà laissé un avis garde l'accès pour le corriger.
   */
  const showReviewForm = isLoggedIn && (canReview || !!myExistingReview)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-10 py-8">
        {/* Fil d'Ariane. Le nom produit est tronqué : les références PC dépassent
            100 caractères et faisaient passer le fil d'Ariane sur deux lignes. */}
        {/* Le nom du produit ne figure pas dans le fil : les références PC
            dépassent 100 caractères et le faisaient passer sur deux lignes.
            Le titre juste en dessous le donne déjà. */}
        <Breadcrumb
          className="mb-6"
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Catalogue', href: '/products' },
            { label: categoryLabel[product.category] || product.category },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-8 lg:gap-12 mb-12 items-start">
          {/* Galerie. Sur mobile elle passe naturellement en premier : c'est
              l'ordre du flux, aucune règle d'ordre n'est nécessaire. */}
          <div className="relative">
            <ProductGallery
              images={product.image_urls || []}
              videoUrl={product.video_url}
              forcedImage={configImage}
              productName={product.name}
            />
            <FavoriteButton
              productId={product.id}
              size={18}
              className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/45 border border-border-strong text-ink-dim"
            />
          </div>

          {/* Bloc d'achat. Collant sur grand écran : l'acheteur garde le prix et
              le bouton sous les yeux pendant qu'il parcourt la galerie. */}
          <div className="lg:sticky lg:top-24">
            {/* Ni étoiles ni avis au-dessus du nom : ils ouvrent la fiche sur un
                jugement extérieur plutôt que sur le produit. Ils sont plus bas,
                sous la description. Le libellé de rayon a lui aussi été retiré,
                il doublonnait avec le fil d'Ariane. */}
            <h1 className="font-serif font-semibold text-xl sm:text-2xl leading-snug text-ink mb-2">{product.name}</h1>

            {product.short_description && (
              <p className="text-[14px] text-ink-dim leading-[1.6] mb-3">
                {stripDashes(product.short_description)}
              </p>
            )}

            {/* Le prix garde la même couleur qu'il soit remisé ou non : c'est
                le prix à payer, et le passer au vert en promotion le faisait
                changer de nature d'une fiche à l'autre. L'économie réalisée,
                juste en dessous, dit déjà qu'il y a une offre. */}
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <span className={`${PRICE} text-3xl font-bold`}>
                {hasVariants && !matchedVariant && <span className="text-base font-semibold">À partir de </span>}
                {formatAmount(displayPrice)} FCFA
              </span>
              {hasPromo && (
                <span className={`${PRICE_OLD} text-[15px]`}>
                  {formatAmount(product.compare_at_price_fcfa!)}
                </span>
              )}
            </div>

            {hasPromo && (
              <p className="text-sm font-semibold text-gold mb-3 tabular-nums">
                Vous économisez {formatAmount(product.compare_at_price_fcfa! - displayPrice)} FCFA
                {' '}({Math.round(((product.compare_at_price_fcfa! - displayPrice) / product.compare_at_price_fcfa!) * 100)}%)
              </p>
            )}

            {/* Pas de ligne d'état sous le prix : sur un catalogue où presque
                tout est disponible, elle répétait la même phrase sur chaque
                fiche sans rien apprendre. Une indisponibilité réelle se dit
                là où elle compte, sur le bouton d'achat lui même. */}

            {hasVariants && matchedVariant && matchedVariant.stock === 0 && (
              <span className="inline-block mb-3 text-xs font-semibold px-3 py-1.5 rounded-full bg-border-strong text-ink">
                Rupture pour cette variante
              </span>
            )}

            <SoldByBlock
              sellerName={product.sellers?.name || 'CACAO'}
              avgRating={sellerStats?.avgRating}
              reviewCount={sellerStats?.reviewCount}
              productCount={sellerStats?.productCount}
            />

            {/* Configuration de base et accessoires fournis. Ce bloc avait été
                retiré au motif que les sélecteurs ci-dessous montraient déjà le
                processeur et la mémoire : c'était vrai des produits configurés,
                faux de tous les autres, où plus rien n'apparaissait. Il dit ce
                que la machine EST ; le résumé de ce que le client a CHOISI
                reste sous les sélecteurs. */}
            <BaseConfig specs={product.specs || {}} glossary={glossary} />
            <IncludedItems items={product.included_items || []} />

            <div className="my-5 space-y-5">
              <ProductConfigurator
                options={options}
                selection={selection}
                /* `toggleValue` connaît le mode de l'option : en choix unique
                   la valeur remplace la précédente, en choix multiple elle
                   s'ajoute. La page n'a pas à refaire ce raisonnement. */
                onToggle={(option, valueId) =>
                  setSelection(s => toggleValue(option, s, valueId))
                }
              />

              <ConfigSummary options={options} selection={selection} basePrice={basePrice} />
            </div>

            {/* Ancien sélecteur de variantes, conservé pour les produits saisis
                avant le passage au supplément par valeur. Il ne s'affiche que
                si aucune configuration moderne n'existe sur ce produit. */}
            {options.length === 0 && hasVariants && (
              <div className="mb-4 space-y-4">
                {product.variant_options!.map(option => (
                  <div key={option.name}>
                    <p className="text-sm font-semibold text-ink mb-2">{option.name}</p>
                    <div className="flex flex-wrap gap-2.5">
                      {option.values.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleSelectOption(option.name, value)}
                          className={`px-5 py-2.5 rounded-xl text-[13.5px] border-2 transition-colors ${
                            selectedOptions[option.name] === value
                              ? 'border-accent bg-accent/10 text-ink font-semibold'
                              : 'border-border text-ink-dim hover:border-border-strong'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!allOptionsSelected && (
                  <p className="text-xs text-ink-dimmer">Choisissez une option pour chaque caractéristique ci-dessus.</p>
                )}
                {allOptionsSelected && !matchedVariant && (
                  <p className="text-xs text-danger">Cette combinaison n&apos;est pas disponible.</p>
                )}
              </div>
            )}

            {/* Quantité et « Ajouter au panier » sur la même ligne : la
                quantité se choisit pour une action précise, et la reléguer sur
                sa propre rangée l'éloignait du geste qu'elle qualifie.
                « Commander maintenant » passe dessous, pleine largeur : c'est
                un raccourci vers le paiement, pas une variante du bouton
                voisin, et l'aligner à côté donnait deux actions de poids égal
                entre lesquelles il fallait trancher. */}
            <div className="space-y-3">
              <div className="flex items-stretch gap-3">
                {product.availability !== 'discontinued' && (
                  <div className="flex items-center border border-border-strong rounded-xl flex-shrink-0">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      aria-label="Diminuer la quantité"
                      className="w-10 self-stretch flex items-center justify-center text-ink"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      aria-label="Augmenter la quantité"
                      className="w-10 self-stretch flex items-center justify-center text-ink"
                    >
                      +
                    </button>
                  </div>
                )}

                <Button
                  variant="solid"
                  size="lg"
                  className="flex-1"
                  disabled={!canAddToCart}
                  onClick={handleAddToCart}
                >
                  {blockedByLegacyVariant
                    ? 'Choisissez une combinaison'
                    : !canAddToCart
                    ? 'Rupture de stock'
                    : added
                    ? 'Ajouté ✓'
                    : 'Ajouter au panier'}
                </Button>
              </div>

              <Button
                variant="sober"
                size="lg"
                className="w-full"
                disabled={!canAddToCart}
                onClick={handleBuyNow}
              >
                Commander maintenant
              </Button>
            </div>


            {/* La section « Livraison et garantie » qui détaillait ces quatre
                points en pavés a été retirée : la rangée ci dessus dit la même
                chose en une ligne. Le lien vers les conditions reste, lui : ce
                sont les engagements réels, et les rendre inaccessibles depuis
                la fiche serait un recul déguisé en épuration. */}
            {/* Trois actions encadrées plutôt que trois textes séparés par des
                points. Les séparateurs disparaissent : chaque cadre délimite
                déjà son action, et sur téléphone les points tombaient seuls en
                bout de ligne. */}
            <div className="flex items-center flex-wrap justify-center gap-2.5 mt-4">
              <Link
                href={`/account/messages?productId=${product.id}&productName=${encodeURIComponent(product.name)}`}
                className={LINK_FRAMED}
              >
                Une question sur ce produit ?
                <ArrowRight size={15} strokeWidth={2} className={LINK_FRAMED_ARROW} />
              </Link>
              <Link href="/legal/terms" className={LINK_FRAMED}>
                Livraison et garantie
                <ArrowRight size={15} strokeWidth={2} className={LINK_FRAMED_ARROW} />
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className={LINK_FRAMED}
              >
                {shared ? 'Lien copié ✓' : 'Partager'}
              </button>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1.5 bg-bg-panel border border-border rounded-full text-ink-dim">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Réassurance sous les deux colonnes, sur toute la largeur.
            Logée dans la colonne d achat elle ne disposait que de 500 px, et
            les quatre libellés y passaient à la ligne. Ici ils tiennent sur
            une rangée, et le filet sépare la zone d achat de la lecture. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-10 pb-8 border-b border-border">
          {[
            { icon: ShieldCheck, label: 'Paiement sécurisé' },
            { icon: Truck, label: 'Livraison suivie' },
            { icon: RotateCcw, label: 'Retour 14 jours' },
            { icon: MessageCircle, label: 'Conseil avant achat' },
          ].map(item => (
            /* Pictogrammes nettement plus grands que le texte qu'ils
               accompagnent : à 17 px ils avaient la taille d'une lettre et se
               lisaient comme de la ponctuation. Ce sont eux qu'on repère en
               parcourant la page, le libellé ne fait que les confirmer. */
            <span key={item.label} className="flex items-center gap-2.5">
              <item.icon size={26} strokeWidth={1.7} className="text-accent flex-shrink-0" />
              <span className="text-[13.5px] font-medium text-ink-dim">{item.label}</span>
            </span>
          ))}
        </div>

        {/*
          Les onglets ont disparu : ils cachaient la description et les avis
          derrière un clic, alors que ce sont les deux contenus que l'acheteur
          vient chercher après avoir vu le prix. Tout est désormais empilé, dans
          l'ordre de lecture.
        */}
        <div className="mb-16 space-y-8">
          {/* La description saisie en administration n'est plus affichée ici :
              elle reprenait en un long pavé ce que le tableau des
              caractéristiques dit déjà en quatre lignes. Elle reste en base et
              dans l'administration, elle a simplement quitté la vitrine. */}
          <ProductDescription blocks={descriptionBlocks} />

          {/* Le tableau « Caractéristiques » a été retiré : la section
              Description porte désormais chaque pièce avec sa valeur réelle,
              et le répéter en tableau juste en dessous disait deux fois la
              même chose. Les valeurs restent lisibles dans le sommaire de la
              description, et intactes en administration. */}

          {/* Composants détaillés, déplacés depuis la colonne d'achat où ils
              allongeaient la distance entre le prix et le bouton. */}
          {components.length > 0 && (
            <section className="rounded-xl border border-border bg-bg-panel p-5 sm:p-6">
              <h2 className="font-display text-[16px] text-ink mb-4">COMPOSANTS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {components.map((c, i) => {
                  const Icon = componentIcon(c.type)
                  return (
                    <div
                      key={`${c.type}-${i}`}
                      className="flex items-start gap-3 rounded-lg border border-border bg-bg-raised px-3.5 py-3"
                    >
                      <Icon size={19} strokeWidth={1.7} className="text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-[13.5px] text-ink leading-[1.45]">
                        <span className="sr-only">{componentTypeLabel(c.type)} : </span>
                        {c.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}


          {/* Avis : sous la description, jamais au-dessus du nom du produit. */}
          <section>
            <h2 className="font-display text-[16px] text-ink mb-4">
              AVIS CLIENTS{reviewCount > 0 ? ` (${reviewCount})` : ''}
            </h2>
            {/* Pleine largeur : bridés à 640 px, les avis formaient une colonne
                étroite qui n'occupait qu'un tiers de l'écran sous une section
                Description qui, elle, allait d'un bord à l'autre. */}
            <div className="space-y-8">
              {reviews.length === 0 ? (
                <p className="text-sm text-ink-dimmer">Aucun avis pour le moment. Les avis sont publiés par les clients ayant reçu ce produit.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[230px,1fr] gap-7 items-start">
                  {/* Synthèse : note moyenne et répartition, toutes deux calculées
                      sur les avis réellement enregistrés. */}
                  <div className="bg-bg-panel border border-border rounded-xl p-5 text-center">
                    <p className="font-display text-[40px] text-ink leading-none">
                      {avgRating.toFixed(1).replace('.', ',')}
                    </p>
                    <div className="flex justify-center my-2">
                      <StarRating rating={avgRating} showCount={false} size={14} />
                    </div>
                    <p className="text-[11.5px] text-ink-dimmer">
                      {reviewCount} avis{reviewCount > 1 ? '' : ''}
                    </p>
                    <div className="mt-4 text-left space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                        const n = reviews.filter(r => r.rating === star).length
                        const pct = reviewCount > 0 ? Math.round((n / reviewCount) * 100) : 0
                        return (
                          <div key={star} className="flex items-center gap-2 text-[10.5px] text-ink-dimmer">
                            <span className="w-5 flex-shrink-0">{star}★</span>
                            <span className="flex-1 h-1.5 bg-bg-raised rounded-full overflow-hidden">
                              <span className="block h-full bg-ink-dimmer" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="w-4 text-right tabular-nums flex-shrink-0">{n}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Une fiche par avis, réparties en colonnes. Empilés en
                      liste, dix avis repoussaient tout le reste de la page ;
                      côte à côte, on en embrasse plusieurs d'un regard.
                      Les étoiles passent en tête de fiche : c'est le jugement
                      qu'on lit en premier, le texte vient l'expliquer. */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {reviews.map(review => (
                      <article
                        key={review.id}
                        className="rounded-xl border border-border bg-bg-panel p-4"
                      >
                        <StarRating rating={review.rating} showCount={false} size={13} />

                        {review.comment && (
                          <p className="text-[12.5px] text-ink-dim leading-[1.7] mt-2.5">
                            {review.comment}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-bg-raised border border-border-mid flex items-center justify-center text-[10px] font-bold text-ink-dim flex-shrink-0">
                            {(review.profiles?.first_name || 'C').charAt(0).toUpperCase()}
                          </span>
                          <span className="text-[12px] font-semibold text-ink">
                            {review.profiles?.first_name || 'Client'}
                          </span>
                          {/* Cette mention n'est pas décorative : seuls les
                              clients dont une commande livrée contient ce
                              produit peuvent déposer un avis. */}
                          <span className="text-[9.5px] bg-green/15 text-green-bright px-1.5 py-0.5 rounded font-bold">
                            Achat vérifié
                          </span>
                          <span className="text-[10.5px] text-ink-faint ml-auto">
                            {new Date(review.created_at).toLocaleDateString('fr-CI', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Un client connecté qui n'a pas encore reçu ce produit voit
                  pourquoi il ne peut pas noter, plutôt qu'une zone vide. */}
              {isLoggedIn && !showReviewForm && (
                <p className="text-[13px] text-ink-dim bg-bg-sunken border border-border rounded-xl px-5 py-4">
                  Les avis sont réservés aux clients ayant reçu ce produit. Le formulaire
                  apparaîtra ici une fois votre commande livrée.
                </p>
              )}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="bg-bg-sunken rounded-xl p-5 border border-border">
                  <p className="text-sm font-semibold text-ink mb-3">
                    {myExistingReview ? 'Modifier votre avis' : 'Laisser un avis'}
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMyRating(star)}
                        aria-label={`${star} étoiles`}
                      >
                        <Star
                          size={24}
                          className={star <= (myRating || myExistingReview?.rating || 0) ? 'fill-accent text-accent' : 'text-border-strong'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="Votre avis (optionnel)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent mb-3 bg-bg-panel"
                  />
                  <Button type="submit" variant="solid" disabled={submittingReview || myRating === 0}>
                    {submittingReview ? 'Envoi...' : 'Publier'}
                  </Button>
                </form>
              )}
            </div>
          </section>

        </div>

        {/* Composer un pack : un acheteur d'unité centrale a souvent besoin
            d'un écran et d'un clavier. Proposé seulement pour les machines —
            un clavier n'appelle pas un pack — et seulement si des accessoires
            existent réellement au catalogue, pour ne pas mener à une page
            vide. */}
        {canBuildPack && (
          <div className="mb-12 rounded-2xl border border-border-strong bg-bg-panel p-6 sm:p-8">
            <h2 className="font-display text-[19px] text-ink mb-2">COMPLÉTEZ VOTRE POSTE</h2>
            <p className="text-[14px] text-ink-dim leading-[1.6] mb-5 max-w-2xl">
              Écran, clavier, souris ou sacoche : ajoutez ce qu&apos;il vous faut autour de cette
              machine. Au-delà de {formatAmount(volumeThreshold)} FCFA d&apos;articles, la remise
              s&apos;applique toute seule.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products?category=accessoire">
                <Button variant="sober">Voir les accessoires</Button>
              </Link>
              <Link href="/products?category=ecrans">
                <Button variant="sober">Ajouter un écran</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-6">Vous aimerez aussi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
              {related.map(p => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
