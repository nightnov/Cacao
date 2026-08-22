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
  sellers?: { name: string } | null
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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const supabase = getSupabaseClient()
        let { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, variant_options, sellers(name)')
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
        <div className="flex-1 max-w-7xl mx-auto w-full px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-[#E4DDCF] rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-4 bg-[#E4DDCF] rounded w-1/4"></div>
              <div className="h-8 bg-[#E4DDCF] rounded w-3/4"></div>
              <div className="h-6 bg-[#E4DDCF] rounded w-1/3"></div>
              <div className="h-12 bg-[#E4DDCF] rounded w-full"></div>
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
        <div className="flex-1 max-w-2xl mx-auto w-full px-10 py-24 text-center">
          <h1 className="font-serif font-semibold text-3xl text-[#1A1A1A] mb-3">Produit introuvable</h1>
          <p className="text-[#56534C] mb-8">Ce produit n&apos;existe pas ou n&apos;est plus disponible.</p>
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

      <div className="flex-1 max-w-5xl mx-auto w-full px-10 py-10">
        {/* Breadcrumb */}
        <div className="text-sm text-[#8A8579] mb-6">
          <Link href="/" className="hover:text-[#FF6600]">Accueil</Link>
          {' / '}
          <Link href="/products" className="hover:text-[#FF6600]">Catalogue</Link>
          {' / '}
          <Link href={`/products?category=${product.category}`} className="hover:text-[#FF6600]">
            {categoryLabel[product.category]}
          </Link>
          {' / '}
          <span className="text-[#1A1A1A]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Gallery */}
          <div className="flex gap-3">
            {(product.image_urls?.length > 0 || embedUrl) && (
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                {embedUrl && (
                  <button
                    onClick={() => setSelectedMedia({ type: 'video', value: product.video_url! })}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-[#1A1A1A] ${
                      selectedMedia?.type === 'video' ? 'border-[#FF6600]' : 'border-transparent'
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
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${
                      selectedMedia?.type === 'image' && selectedMedia.value === url ? 'border-[#FF6600]' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-square bg-white rounded-lg border border-[#E4DDCF] overflow-hidden flex items-center justify-center flex-1 min-w-0">
              {selectedMedia?.type === 'video' && embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : selectedMedia?.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedMedia.value} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
              <FavoriteButton productId={product.id} size={18} className="absolute top-3 right-3 w-9 h-9 shadow-sm" />
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-xs font-semibold text-[#FF6600] uppercase mb-1.5">
              {categoryLabel[product.category]}
            </div>
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-2">{product.name}</h1>

            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="mb-3 hover:opacity-70 transition-opacity"
              >
                <StarRating rating={avgRating} reviewCount={reviewCount} />
              </button>
            )}

            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <span className={`text-xl font-bold ${hasPromo ? 'text-[#1E7A46]' : 'text-[#1A1A1A]'}`}>
                {hasVariants && !matchedVariant && 'À partir de '}
                {displayPrice.toLocaleString('fr-CI')} FCFA
              </span>
              {hasPromo && (
                <span className="text-base text-[#8A8579] line-through">
                  {product.compare_at_price_fcfa!.toLocaleString('fr-CI')} FCFA
                </span>
              )}
              {hasVariants && matchedVariant && matchedVariant.stock === 0 && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#8A8579] text-white">
                  Rupture pour cette variante
                </span>
              )}
            </div>

            <SoldByBlock sellerName={product.sellers?.name || 'CACAO'} />

            {/* Caractéristiques clés (aperçu rapide) */}
            {specEntries.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 my-4 text-sm text-[#56534C]">
                {specEntries.slice(0, 4).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#FF6600]"></span>
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
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-2">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleSelectOption(option.name, value)}
                          className={`px-4 py-2 rounded-full text-sm border-2 transition-colors ${
                            selectedOptions[option.name] === value
                              ? 'border-[#FF6600] bg-orange-50 text-[#FF6600] font-semibold'
                              : 'border-[#E4DDCF] text-[#56534C] hover:border-[#1A1A1A]'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!allOptionsSelected && (
                  <p className="text-xs text-[#8A8579]">Choisissez une option pour chaque caractéristique ci-dessus.</p>
                )}
                {allOptionsSelected && !matchedVariant && (
                  <p className="text-xs text-red-600">Cette combinaison n&apos;est pas disponible.</p>
                )}
              </div>
            )}

            {product.availability !== 'discontinued' && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border-2 border-[#1A1A1A] rounded-full">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600]"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600]"
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

            <div className="flex items-center justify-center gap-5 mt-4 flex-wrap text-xs text-[#56534C]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#1E7A46]" /> Paiement sécurisé
              </span>
              <span className="flex items-center gap-1.5">
                <RotateCcw size={14} className="text-[#1E7A46]" /> Retour sous 14 jours
              </span>
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-[#1E7A46]" /> Livraison suivie
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3">
              <Link
                href={`/account/messages?productId=${product.id}&productName=${encodeURIComponent(product.name)}`}
                className="text-sm text-[#FF6600] hover:underline"
              >
                Une question sur ce produit ?
              </Link>
              <span className="text-[#E4DDCF]">·</span>
              <button
                type="button"
                onClick={handleShare}
                className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors"
              >
                {shared ? 'Lien copié ✓' : 'Partager'}
              </button>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1.5 bg-white border border-[#E4DDCF] rounded-full text-[#56534C]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-16">
          <div className="flex gap-6 border-b border-[#E4DDCF] mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#FF6600] text-[#1A1A1A]'
                    : 'border-transparent text-[#8A8579] hover:text-[#1A1A1A]'
                }`}
              >
                {tab.label}
                {tab.key === 'reviews' && reviewCount > 0 && ` (${reviewCount})`}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <p className="text-sm text-[#56534C] leading-relaxed max-w-2xl">
              {product.description || 'Aucune description disponible pour ce produit.'}
            </p>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-xl">
              {specEntries.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[#E4DDCF]">
                    {specEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="py-2.5 pr-4 text-[#8A8579] w-1/3">{specLabels[key] || key}</td>
                        <td className="py-2.5 text-[#1A1A1A] font-medium">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-[#8A8579]">Aucune caractéristique renseignée pour ce produit.</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-xl space-y-3 text-sm text-[#56534C] leading-relaxed">
              <p>Livraison via Yango partout à Abidjan. Les délais sont estimatifs et peuvent varier selon la zone.</p>
              <p>Paiement sécurisé via MoneyFusion (Wave, Orange Money, MTN Money, Moov Money, carte bancaire).</p>
              <p>Retour possible sous 14 jours après réception pour un produit non utilisé ; remboursement traité sous 7 à 10 jours ouvrables.</p>
              <Link href="/legal/terms" className="inline-block text-[#FF6600] font-semibold hover:underline">
                Voir les conditions complètes →
              </Link>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-8">
              {isLoggedIn && (
                <form onSubmit={handleSubmitReview} className="bg-[#FBF6EE] rounded-xl p-5 border border-[#E4DDCF]">
                  <p className="text-sm font-semibold text-[#1A1A1A] mb-3">
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
                          className={star <= (myRating || myExistingReview?.rating || 0) ? 'fill-[#FF6600] text-[#FF6600]' : 'text-[#E4DDCF]'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="Votre avis (optionnel)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600] mb-3 bg-white"
                  />
                  <Button type="submit" variant="primary" disabled={submittingReview || myRating === 0}>
                    {submittingReview ? 'Envoi...' : 'Publier'}
                  </Button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-[#8A8579]">Aucun avis pour le moment. Soyez le premier à donner votre avis sur ce produit.</p>
              ) : (
                <div className="space-y-5">
                  {reviews.map(review => (
                    <div key={review.id} className="pb-5 border-b border-[#E4DDCF] last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={review.rating} showCount={false} size={13} />
                        <span className="text-xs text-[#8A8579]">
                          {review.profiles?.first_name || 'Client'} · {new Date(review.created_at).toLocaleDateString('fr-CI')}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm text-[#56534C]">{review.comment}</p>}
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
            <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-6">Vous aimerez aussi</h2>
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
