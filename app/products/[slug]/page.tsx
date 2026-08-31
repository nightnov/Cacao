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
import { getVideoEmbedUrl } from '@/lib/video'
import { addToCart } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Star, ShieldCheck, RotateCcw, Truck, CreditCard } from 'lucide-react'
import { VariantOption, ProductVariant } from '@/types/admin'
import { findMatchingVariant, variantLabel } from '@/lib/variants'
import { categoryLabel } from '@/lib/categories'
import { formatAmount } from '@/lib/format'
import { PRICE, PRICE_OLD } from '@/lib/ui'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price_fcfa: number
  compare_at_price_fcfa: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
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

const specLabels: Record<string, string> = {
  cpu: 'Processeur',
  ram: 'Mémoire (RAM)',
  storage: 'Stockage',
  screen: 'Écran'
}

const tabs = [
  { key: 'description', label: 'Description' },
  { key: 'specs', label: 'Caractéristiques' },
  { key: 'shipping', label: 'Livraison & garantie' },
  { key: 'reviews', label: 'Avis' }
] as const

export default function ProductDetail() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, isLoggedIn } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; value: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [shared, setShared] = useState(false)
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['key']>('description')

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

        const attempts = [
          `${BASE}, components, seller_id, sellers(name, created_at)`,
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
        setActiveTab('description')

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

        if (typedProduct.image_urls && typedProduct.image_urls.length > 0) {
          setSelectedMedia({ type: 'image', value: typedProduct.image_urls[0] })
        } else if (typedProduct.video_url) {
          setSelectedMedia({ type: 'video', value: typedProduct.video_url })
        } else {
          setSelectedMedia(null)
        }

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

  const buildCartItem = () => {
    if (!product) return null
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price_fcfa: matchedVariant ? matchedVariant.price_fcfa : product.price_fcfa,
      image_url: matchedVariant?.image_url || product.image_urls?.[0] || null,
      variant_id: matchedVariant?.id,
      variant_label: matchedVariant ? variantLabel(selectedOptions) : undefined
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    if (hasVariants && !matchedVariant) return
    const item = buildCartItem()
    if (!item) return
    addToCart(item, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product) return
    if (hasVariants && !matchedVariant) return
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
      <main className="min-h-screen bg-bg-panel flex flex-col">
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
      <main className="min-h-screen bg-bg-panel flex flex-col">
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

  const displayPrice = matchedVariant ? matchedVariant.price_fcfa : product.price_fcfa
  const hasPromo = !matchedVariant && !!product.compare_at_price_fcfa && product.compare_at_price_fcfa > product.price_fcfa
  const embedUrl = product.video_url ? getVideoEmbedUrl(product.video_url) : null
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v)
  const components = sanitizeComponents(product.components)

  // Seules les machines appellent un pack, et seulement si le catalogue a de
  // quoi le composer : proposer « ajouter un écran » sans écran en rayon
  // mènerait à une page vide.
  const canBuildPack =
    ['portable', 'bureau', 'gaming'].includes(product.category) && hasCompanionProducts
  const canAddToCart = hasVariants
    ? !!matchedVariant && matchedVariant.stock > 0
    : product.availability !== 'discontinued'

  const reviewCount = reviews.length
  const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0
  const myExistingReview = isLoggedIn && user ? reviews.find(r => r.user_id === user.id) : undefined

  return (
    <main className="min-h-screen bg-bg-panel flex flex-col">
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
          {/* Gallery */}
          <div className="flex gap-3">
            {(product.image_urls?.length > 0 || embedUrl) && (
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                {embedUrl && (
                  <button
                    onClick={() => setSelectedMedia({ type: 'video', value: product.video_url! })}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-bg-raised ${
                      selectedMedia?.type === 'video' ? 'border-ink' : 'border-transparent'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
                {product.image_urls?.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setSelectedMedia({ type: 'image', value: url })}
                    aria-label={`Voir la photo ${i + 1}`}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 bg-bg-panel transition-colors ${
                      selectedMedia?.type === 'image' && selectedMedia.value === url
                        ? 'border-ink'
                        : 'border-border hover:border-ink-faint'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-square bg-bg-panel rounded-2xl border border-border overflow-hidden flex items-center justify-center flex-1 min-w-0">
              {selectedMedia?.type === 'video' && embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`Vidéo de présentation : ${product.name}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : selectedMedia?.type === 'image' ? (
                // object-contain (et non object-cover) : sur une fiche produit,
                // recadrer la photo cache une partie de l'appareil que le client achète.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedMedia.value} alt={product.name} className="w-full h-full object-contain p-4" />
              ) : (
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
              <FavoriteButton productId={product.id} size={18} className="absolute top-3 right-3 w-9 h-9 shadow-sm" />
            </div>
          </div>

          {/* Bandeau de vignettes pour mobile : la colonne verticale est masquée
              sous `sm`, sans ça les photos secondaires étaient inaccessibles au doigt. */}
          {(product.image_urls?.length > 1 || (product.image_urls?.length > 0 && embedUrl)) && (
            <div className="sm:hidden -mt-6 mb-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {embedUrl && (
                <button
                  onClick={() => setSelectedMedia({ type: 'video', value: product.video_url! })}
                  aria-label="Voir la vidéo"
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-bg-raised ${
                    selectedMedia?.type === 'video' ? 'border-ink' : 'border-border'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
              {product.image_urls?.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setSelectedMedia({ type: 'image', value: url })}
                  aria-label={`Voir la photo ${i + 1}`}
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 bg-bg-panel ${
                    selectedMedia?.type === 'image' && selectedMedia.value === url
                      ? 'border-ink'
                      : 'border-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}

          {/* Bloc d'achat. Collant sur grand écran : l'acheteur garde le prix et
              le bouton sous les yeux pendant qu'il parcourt la galerie et les specs. */}
          <div className="lg:sticky lg:top-24">
            {/* Le libellé de catégorie a été retiré ici : il doublonnait avec le fil d'Ariane. */}
            <h1 className="font-serif font-semibold text-xl sm:text-2xl leading-snug text-ink mb-2">{product.name}</h1>

            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="mb-3 hover:opacity-70 transition-opacity rounded"
              >
                <StarRating rating={avgRating} reviewCount={reviewCount} />
              </button>
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

            {/* Caractéristiques clés (aperçu rapide) */}
            {specEntries.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 my-4 text-sm text-ink-dim">
                {specEntries.slice(0, 4).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-ink-dimmer"></span>
                    {String(value)}
                  </li>
                ))}
              </ul>
            )}

            {/* Composants : la liste que l'acheteur compare avant de décider.
                Deux colonnes plutôt qu'une liste à puces — chaque pièce est
                lisible d'un coup d'œil sans balayer tout le paragraphe. */}
            {components.length > 0 && (
              <div className="my-5">
                <h2 className="font-display text-[17px] text-ink mb-3">COMPOSANTS</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {components.map((c, i) => {
                    const Icon = componentIcon(c.type)
                    return (
                      <div
                        key={`${c.type}-${i}`}
                        className="flex items-start gap-3 rounded-xl border border-border bg-bg-panel px-3.5 py-3"
                      >
                        <Icon
                          size={19}
                          strokeWidth={1.7}
                          className="text-ink-dimmer flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="text-[13.5px] text-ink leading-[1.45]">
                          <span className="sr-only">{componentTypeLabel(c.type)} : </span>
                          {c.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Variant picker */}
            {hasVariants && (
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
                          /* Rectangles arrondis plutôt que pastilles : les
                             valeurs sont parfois longues (« Lian Li 8.8 pouces »)
                             et une pastille très allongée se lit mal. */
                          className={`px-5 py-2.5 rounded-xl text-[13.5px] border-2 transition-colors ${
                            selectedOptions[option.name] === value
                              ? 'border-ink-dimmer bg-bg-raised text-ink font-semibold'
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

            {product.availability !== 'discontinued' && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border-2 border-border-strong rounded-full">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-ink hover:text-ink"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-ink hover:text-ink"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="sober"
                size="lg"
                className="flex-1"
                disabled={!canAddToCart}
                onClick={handleAddToCart}
              >
                {hasVariants && !matchedVariant
                  ? 'Choisissez une combinaison'
                  : !canAddToCart
                  ? 'Rupture de stock'
                  : added
                  ? 'Ajouté ✓'
                  : 'Ajouter au panier'}
              </Button>
              <Button
                variant="solid"
                size="lg"
                className="flex-1"
                disabled={!canAddToCart}
                onClick={handleBuyNow}
              >
                Acheter maintenant
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {[
                { icon: ShieldCheck, label: 'Paiement sécurisé', sub: 'Wave, Orange, MTN, Moov, carte' },
                { icon: RotateCcw, label: 'Retour sous 14 jours', sub: 'Si le produit ne convient pas' },
                { icon: Truck, label: 'Livraison suivie', sub: 'Code remis à la réception' }
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-1 px-1">
                  <item.icon size={16} className="text-green-bright" />
                  <span className="text-[11px] font-semibold text-ink leading-tight">{item.label}</span>
                  <span className="text-[10px] text-ink-dimmer leading-tight">{item.sub}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3">
              <Link
                href={`/account/messages?productId=${product.id}&productName=${encodeURIComponent(product.name)}`}
                className="text-sm text-ink hover:underline"
              >
                Une question sur ce produit ?
              </Link>
              <span className="text-border-strong">·</span>
              <button
                type="button"
                onClick={handleShare}
                className="text-sm text-ink-dim hover:text-ink transition-colors"
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

        {/* Tabs */}
        <div className="mb-16">
          <div className="flex gap-6 border-b border-border mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-ink text-ink'
                    : 'border-transparent text-ink-dimmer hover:text-ink'
                }`}
              >
                {tab.label}
                {tab.key === 'reviews' && reviewCount > 0 && ` (${reviewCount})`}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <p className="text-sm text-ink-dim leading-relaxed max-w-2xl">
              {product.description || 'Aucune description disponible pour ce produit.'}
            </p>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-3xl">
              {specEntries.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  {specEntries.map(([key, value], i) => (
                    <div
                      key={key}
                      className={`grid grid-cols-1 sm:grid-cols-[220px,1fr] text-[12.5px] ${i % 2 === 0 ? 'bg-bg-panel' : ''}`}
                    >
                      <div className="px-4 py-3 text-ink-dimmer sm:border-r border-border">{specLabels[key] || key}</div>
                      <div className="px-4 pb-3 sm:py-3 text-ink font-medium">{String(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-dimmer">Aucune caractéristique renseignée pour ce produit.</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    icon: Truck,
                    t: 'Délai de livraison',
                    p: 'Comptez moins de 5 jours pour Abidjan et l’intérieur du pays. Le suivi apparaît dans votre espace client dès l’expédition.'
                  },
                  {
                    icon: ShieldCheck,
                    t: 'Code de livraison',
                    p: 'Un code à quatre chiffres apparaît dans votre compte dès que la commande part. Ne le donnez au livreur qu’à la remise du colis.'
                  },
                  {
                    icon: RotateCcw,
                    t: 'Retour sous 14 jours',
                    p: 'Si l’appareil ne correspond pas à votre usage, vous disposez de 14 jours après réception pour nous le retourner.'
                  },
                  {
                    icon: CreditCard,
                    t: 'Moyens de paiement',
                    p: 'Wave, Orange Money, MTN Money, Moov Money et carte bancaire. La transaction est traitée par MoneyFusion.'
                  }
                ].map(({ icon: Icon, t, p }) => (
                  <div key={t} className="bg-bg-panel border border-border rounded-xl p-5">
                    <Icon size={20} strokeWidth={1.8} className="text-ink-dimmer mb-2.5" />
                    <h4 className="text-[13.5px] font-bold text-ink mb-1.5">{t}</h4>
                    <p className="text-[12px] text-ink-dimmer leading-[1.65]">{p}</p>
                  </div>
                ))}
              </div>
              <Link href="/legal/terms" className="inline-block mt-5 text-[13px] text-ink font-bold hover:underline">
                Voir les conditions complètes →
              </Link>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-8">
              {isLoggedIn && (
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
                          className={star <= (myRating || myExistingReview?.rating || 0) ? 'fill-gold text-gold' : 'text-border-strong'}
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

              {reviews.length === 0 ? (
                <p className="text-sm text-ink-dimmer">Aucun avis pour le moment. Soyez le premier à donner votre avis sur ce produit.</p>
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

                  <div className="space-y-5">
                    {reviews.map(review => (
                      <div key={review.id} className="pb-5 border-b border-border last:border-b-0">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                          <span className="w-7 h-7 rounded-full bg-bg-raised border border-border-mid flex items-center justify-center text-[11px] font-bold text-ink-dim flex-shrink-0">
                            {(review.profiles?.first_name || 'C').charAt(0).toUpperCase()}
                          </span>
                          <span className="text-[12.5px] font-bold text-ink">
                            {review.profiles?.first_name || 'Client'}
                          </span>
                          <span className="text-[9.5px] bg-green/15 text-green-bright px-1.5 py-0.5 rounded font-bold">
                            Achat vérifié
                          </span>
                          <span className="text-[10.5px] text-ink-faint ml-auto">
                            {new Date(review.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <StarRating rating={review.rating} showCount={false} size={12} />
                        {review.comment && <p className="text-[12.5px] text-ink-dim leading-[1.7] mt-2">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
