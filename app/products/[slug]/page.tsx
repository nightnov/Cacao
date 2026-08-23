'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { ProductCard } from '@/components/ProductCard'
import { FavoriteButton } from '@/components/FavoriteButton'
import { SoldByBlock } from '@/components/SoldByBlock'
import { StarRating } from '@/components/StarRating'
import { getSupabaseClient } from '@/lib/supabase'
import { getVideoEmbedUrl } from '@/lib/video'
import { addToCart } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Star, ShieldCheck, RotateCcw, Truck } from 'lucide-react'
import { VariantOption, ProductVariant } from '@/types/admin'
import { findMatchingVariant, variantLabel } from '@/lib/variants'
import { categoryLabel } from '@/lib/categories'
import { formatAmount } from '@/lib/format'

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
        let { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, variant_options, seller_id, sellers(name, created_at)')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle()

        // Repli si la table/relation "sellers" n'est pas encore en place (migration non exécutée)
        if (error?.code === 'PGRST200') {
          ;({ data, error } = await supabase
            .from('products')
            .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, variant_options')
            .eq('slug', slug)
            .eq('status', 'active')
            .maybeSingle())
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
      <main className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-[#E8E0D8] rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-4 bg-[#E8E0D8] rounded w-1/4"></div>
              <div className="h-8 bg-[#E8E0D8] rounded w-3/4"></div>
              <div className="h-6 bg-[#E8E0D8] rounded w-1/3"></div>
              <div className="h-12 bg-[#E8E0D8] rounded w-full"></div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (notFound || !product) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-24 text-center">
          <h1 className="font-serif font-semibold text-3xl text-[#241A14] mb-3">Produit introuvable</h1>
          <p className="text-[#5B4B41] mb-8">Ce produit n&apos;existe pas ou n&apos;est plus disponible.</p>
          <Link href="/products">
            <Button variant="primary">Retour au catalogue</Button>
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
  const canAddToCart = hasVariants
    ? !!matchedVariant && matchedVariant.stock > 0
    : product.availability !== 'discontinued'

  const reviewCount = reviews.length
  const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0
  const myExistingReview = isLoggedIn && user ? reviews.find(r => r.user_id === user.id) : undefined

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-10 py-8">
        {/* Fil d'Ariane. Le nom produit est tronqué : les références PC dépassent
            100 caractères et faisaient passer le fil d'Ariane sur deux lignes. */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-[#7D6A5D] mb-6 min-w-0">
          <Link href="/" className="hover:text-[#C2410C] whitespace-nowrap">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link href="/products" className="hover:text-[#C2410C] whitespace-nowrap">Catalogue</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/products?category=${product.category}`} className="hover:text-[#C2410C] whitespace-nowrap">
            {categoryLabel[product.category] || product.category}
          </Link>
          <span aria-hidden="true" className="hidden sm:inline">/</span>
          <span className="text-[#241A14] truncate hidden sm:inline" title={product.name}>{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-8 lg:gap-12 mb-12 items-start">
          {/* Gallery */}
          <div className="flex gap-3">
            {(product.image_urls?.length > 0 || embedUrl) && (
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                {embedUrl && (
                  <button
                    onClick={() => setSelectedMedia({ type: 'video', value: product.video_url! })}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-[#241A14] ${
                      selectedMedia?.type === 'video' ? 'border-[#C2410C]' : 'border-transparent'
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
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 bg-white transition-colors ${
                      selectedMedia?.type === 'image' && selectedMedia.value === url
                        ? 'border-[#C2410C]'
                        : 'border-[#E8E0D8] hover:border-[#7D6A5D]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-square bg-white rounded-2xl border border-[#E8E0D8] overflow-hidden flex items-center justify-center flex-1 min-w-0">
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
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="1">
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
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-[#241A14] ${
                    selectedMedia?.type === 'video' ? 'border-[#C2410C]' : 'border-[#E8E0D8]'
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
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 bg-white ${
                    selectedMedia?.type === 'image' && selectedMedia.value === url
                      ? 'border-[#C2410C]'
                      : 'border-[#E8E0D8]'
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
          <div className="lg:sticky lg:top-6">
            {/* Le libellé de catégorie a été retiré ici : il doublonnait avec le fil d'Ariane. */}
            <h1 className="font-serif font-semibold text-xl sm:text-2xl leading-snug text-[#241A14] mb-2">{product.name}</h1>

            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="mb-3 hover:opacity-70 transition-opacity rounded"
              >
                <StarRating rating={avgRating} reviewCount={reviewCount} />
              </button>
            )}

            <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
              <span className={`text-3xl font-bold tabular-nums ${hasPromo ? 'text-[#1E7A46]' : 'text-[#241A14]'}`}>
                {hasVariants && !matchedVariant && <span className="text-base font-semibold">À partir de </span>}
                {formatAmount(displayPrice)} FCFA
              </span>
              {hasPromo && (
                <span className="text-base text-[#7D6A5D] line-through tabular-nums">
                  {formatAmount(product.compare_at_price_fcfa!)}
                </span>
              )}
            </div>

            {hasPromo && (
              <p className="text-sm font-semibold text-[#1E7A46] mb-3 tabular-nums">
                Vous économisez {formatAmount(product.compare_at_price_fcfa! - displayPrice)} FCFA
                {' '}({Math.round(((product.compare_at_price_fcfa! - displayPrice) / product.compare_at_price_fcfa!) * 100)}%)
              </p>
            )}

            {hasVariants && matchedVariant && matchedVariant.stock === 0 && (
              <span className="inline-block mb-3 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#7D6A5D] text-white">
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
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 my-4 text-sm text-[#5B4B41]">
                {specEntries.slice(0, 4).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#C2410C]"></span>
                    {String(value)}
                  </li>
                ))}
              </ul>
            )}

            {/* Variant picker */}
            {hasVariants && (
              <div className="mb-4 space-y-3">
                {product.variant_options!.map(option => (
                  <div key={option.name}>
                    <p className="text-sm font-semibold text-[#241A14] mb-2">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleSelectOption(option.name, value)}
                          className={`px-4 py-2 rounded-full text-sm border-2 transition-colors ${
                            selectedOptions[option.name] === value
                              ? 'border-[#C2410C] bg-orange-50 text-[#C2410C] font-semibold'
                              : 'border-[#E8E0D8] text-[#5B4B41] hover:border-[#241A14]'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!allOptionsSelected && (
                  <p className="text-xs text-[#7D6A5D]">Choisissez une option pour chaque caractéristique ci-dessus.</p>
                )}
                {allOptionsSelected && !matchedVariant && (
                  <p className="text-xs text-red-600">Cette combinaison n&apos;est pas disponible.</p>
                )}
              </div>
            )}

            {product.availability !== 'discontinued' && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border-2 border-[#241A14] rounded-full">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#241A14] hover:text-[#C2410C]"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#241A14] hover:text-[#C2410C]"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
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
                variant="primary"
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
                  <item.icon size={16} className="text-[#1E7A46]" />
                  <span className="text-[11px] font-semibold text-[#241A14] leading-tight">{item.label}</span>
                  <span className="text-[10px] text-[#7D6A5D] leading-tight">{item.sub}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3">
              <Link
                href={`/account/messages?productId=${product.id}&productName=${encodeURIComponent(product.name)}`}
                className="text-sm text-[#C2410C] hover:underline"
              >
                Une question sur ce produit ?
              </Link>
              <span className="text-[#E8E0D8]">·</span>
              <button
                type="button"
                onClick={handleShare}
                className="text-sm text-[#5B4B41] hover:text-[#C2410C] transition-colors"
              >
                {shared ? 'Lien copié ✓' : 'Partager'}
              </button>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1.5 bg-white border border-[#E8E0D8] rounded-full text-[#5B4B41]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-16">
          <div className="flex gap-6 border-b border-[#E8E0D8] mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#C2410C] text-[#241A14]'
                    : 'border-transparent text-[#7D6A5D] hover:text-[#241A14]'
                }`}
              >
                {tab.label}
                {tab.key === 'reviews' && reviewCount > 0 && ` (${reviewCount})`}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <p className="text-sm text-[#5B4B41] leading-relaxed max-w-2xl">
              {product.description || 'Aucune description disponible pour ce produit.'}
            </p>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-xl">
              {specEntries.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[#E8E0D8]">
                    {specEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="py-2.5 pr-4 text-[#7D6A5D] w-1/3">{specLabels[key] || key}</td>
                        <td className="py-2.5 text-[#241A14] font-medium">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-[#7D6A5D]">Aucune caractéristique renseignée pour ce produit.</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-xl space-y-3 text-sm text-[#5B4B41] leading-relaxed">
              <p>Livraison via Yango partout à Abidjan. Les délais sont estimatifs et peuvent varier selon la zone.</p>
              <p>Paiement sécurisé via MoneyFusion (Wave, Orange Money, MTN Money, Moov Money, carte bancaire).</p>
              <p>Retour possible sous 14 jours après réception pour un produit non utilisé ; remboursement traité sous 7 à 10 jours ouvrables.</p>
              <Link href="/legal/terms" className="inline-block text-[#C2410C] font-semibold hover:underline">
                Voir les conditions complètes →
              </Link>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-8">
              {isLoggedIn && (
                <form onSubmit={handleSubmitReview} className="bg-[#FAF7F4] rounded-xl p-5 border border-[#E8E0D8]">
                  <p className="text-sm font-semibold text-[#241A14] mb-3">
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
                          className={star <= (myRating || myExistingReview?.rating || 0) ? 'fill-[#C2410C] text-[#C2410C]' : 'text-[#E8E0D8]'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="Votre avis (optionnel)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] mb-3 bg-white"
                  />
                  <Button type="submit" variant="primary" disabled={submittingReview || myRating === 0}>
                    {submittingReview ? 'Envoi...' : 'Publier'}
                  </Button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-[#7D6A5D]">Aucun avis pour le moment. Soyez le premier à donner votre avis sur ce produit.</p>
              ) : (
                <div className="space-y-5">
                  {reviews.map(review => (
                    <div key={review.id} className="pb-5 border-b border-[#E8E0D8] last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={review.rating} showCount={false} size={13} />
                        <span className="text-xs text-[#7D6A5D]">
                          {review.profiles?.first_name || 'Client'} · {new Date(review.created_at).toLocaleDateString('fr-CI')}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm text-[#5B4B41]">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <h2 className="font-serif font-semibold text-2xl text-[#241A14] mb-6">Vous aimerez aussi</h2>
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
