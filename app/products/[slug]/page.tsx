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

interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: 'portable' | 'bureau' | 'accessoire'
  price_fcfa: number
  availability: 'in_stock' | 'on_order' | 'discontinued'
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
  video_url: string | null
}

const categoryLabel: Record<string, string> = {
  portable: 'Portable',
  bureau: 'Ordinateur de bureau',
  accessoire: 'Accessoire'
}

const availabilityLabel: Record<string, { text: string; color: string }> = {
  in_stock: { text: 'En stock', color: 'bg-[#1E7A46] text-white' },
  on_order: { text: 'En commande', color: 'bg-[#E85D25] text-white' },
  discontinued: { text: 'Rupture', color: 'bg-[#8A8579] text-white' }
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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, category, price_fcfa, availability, specs, tags, image_urls, video_url')
          .eq('slug', slug)
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

  const handleAddToCart = () => {
    if (!product) return
    addToCart(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price_fcfa: product.price_fcfa,
        image_url: product.image_urls?.[0] || null
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

  const avail = availabilityLabel[product.availability]
  const embedUrl = product.video_url ? getVideoEmbedUrl(product.video_url) : null
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v)

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-10 py-12">
        {/* Breadcrumb */}
        <div className="text-sm text-[#8A8579] mb-8">
          <Link href="/products" className="hover:text-[#E85D25]">Catalogue</Link>
          {' / '}
          <Link href={`/products?category=${product.category}`} className="hover:text-[#E85D25]">
            {categoryLabel[product.category]}
          </Link>
          {' / '}
          <span className="text-[#1A1A1A]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          {/* Gallery */}
          <div>
            <div className="aspect-square bg-white rounded-lg border border-[#E4DDCF] overflow-hidden mb-4 flex items-center justify-center">
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
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
            </div>

            {(product.image_urls?.length > 0 || embedUrl) && (
              <div className="flex gap-3 flex-wrap">
                {embedUrl && (
                  <button
                    onClick={() => setSelectedMedia({ type: 'video', value: product.video_url! })}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-[#1A1A1A] ${
                      selectedMedia?.type === 'video' ? 'border-[#E85D25]' : 'border-transparent'
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
                {product.image_urls?.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setSelectedMedia({ type: 'image', value: url })}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      selectedMedia?.type === 'image' && selectedMedia.value === url ? 'border-[#E85D25]' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="text-xs font-semibold text-[#E85D25] uppercase mb-2">
              {categoryLabel[product.category]}
            </div>
            <h1 className="font-serif font-semibold text-3xl text-[#1A1A1A] mb-4">{product.name}</h1>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-bold text-[#1A1A1A]">
                {product.price_fcfa.toLocaleString('fr-CI')} FCFA
              </span>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${avail.color}`}>
                {avail.text}
              </span>
            </div>

            {product.description && (
              <p className="text-[#56534C] leading-relaxed mb-6">{product.description}</p>
            )}

            {product.availability !== 'discontinued' && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border-2 border-[#1A1A1A] rounded-full">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:text-[#E85D25]"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:text-[#E85D25]"
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
              disabled={product.availability === 'discontinued'}
              onClick={handleAddToCart}
            >
              {product.availability === 'discontinued'
                ? 'Rupture de stock'
                : added
                ? 'Ajouté au panier ✓'
                : 'Ajouter au panier'}
            </Button>

            <Link
              href={`/account/messages?productId=${product.id}&productName=${encodeURIComponent(product.name)}`}
              className="block text-center text-sm text-[#E85D25] hover:underline mt-4"
            >
              Une question sur ce produit ?
            </Link>

            {/* Specs */}
            {specEntries.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#E4DDCF]">
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-4">Spécifications</h2>
                <div className="space-y-2">
                  {specEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-[#E4DDCF] text-sm">
                      <span className="text-[#8A8579]">{specLabels[key] || key}</span>
                      <span className="text-[#1A1A1A] font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mt-6 flex gap-2 flex-wrap">
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
            <h2 className="font-serif font-semibold text-3xl text-[#1A1A1A] mb-10">Vous aimerez aussi</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
