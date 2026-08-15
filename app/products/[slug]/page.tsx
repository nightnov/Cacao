'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { ProductCard } from '@/components/ProductCard'
import { getSupabaseClient } from '@/lib/supabase'
import { getVideoEmbedUrl } from '@/lib/video'
import { addToCart } from '@/lib/cart'
import { VariantOption, ProductVariant } from '@/types/admin'
import { findMatchingVariant, variantLabel } from '@/lib/variants'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: 'portable' | 'bureau' | 'accessoire'
  price_fcfa: number
  compare_at_price_fcfa: number | null
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
  video_url: string | null
  variant_options?: VariantOption[]
}

const categoryLabel: Record<string, string> = {
  portable: 'Portable',
  bureau: 'Ordinateur de bureau',
  accessoire: 'Accessoire'
}

const specLabels: Record<string, string> = {
  cpu: 'Processeur',
  ram: 'Mémoire (RAM)',
  storage: 'Stockage',
  screen: 'Écran'
}

export default function ProductDetail() {
  const params = useParams()
  const slug = params.slug as string

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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, variant_options')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle()

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

  const handleAddToCart = () => {
    if (!product) return
    if (hasVariants && !matchedVariant) return

    addToCart(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price_fcfa: matchedVariant ? matchedVariant.price_fcfa : product.price_fcfa,
        image_url: matchedVariant?.image_url || product.image_urls?.[0] || null,
        variant_id: matchedVariant?.id,
        variant_label: matchedVariant ? variantLabel(selectedOptions) : undefined
      },
      quantity
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
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

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-10 py-10">
        {/* Breadcrumb */}
        <div className="text-sm text-[#8A8579] mb-6">
          <Link href="/products" className="hover:text-[#FF6600]">Catalogue</Link>
          {' / '}
          <Link href={`/products?category=${product.category}`} className="hover:text-[#FF6600]">
            {categoryLabel[product.category]}
          </Link>
          {' / '}
          <span className="text-[#1A1A1A]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
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

            <div className="aspect-square bg-white rounded-lg border border-[#E4DDCF] overflow-hidden flex items-center justify-center flex-1 min-w-0">
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
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-xs font-semibold text-[#FF6600] uppercase mb-1.5">
              {categoryLabel[product.category]}
            </div>
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-3">{product.name}</h1>

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

            {product.description && (
              <p className="text-sm text-[#56534C] leading-relaxed mb-4">{product.description}</p>
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

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
            >
              {hasVariants && !matchedVariant
                ? 'Choisissez une combinaison'
                : !canAddToCart
                ? 'Rupture de stock'
                : added
                ? 'Ajouté au panier ✓'
                : 'Ajouter au panier'}
            </Button>

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

            {/* Specs */}
            {specEntries.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#E4DDCF]">
                <h2 className="font-serif font-semibold text-lg text-[#1A1A1A] mb-3">Spécifications</h2>
                <div className="space-y-1.5">
                  {specEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-[#E4DDCF] text-sm">
                      <span className="text-[#8A8579]">{specLabels[key] || key}</span>
                      <span className="text-[#1A1A1A] font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
