'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { getCart, updateCartItemQuantity, removeFromCart, CartItem, CART_EVENT } from '@/lib/cart'
import { formatAmount } from '@/lib/format'

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const refresh = () => setItems(getCart())
    refresh()
    setLoaded(true)
    window.addEventListener(CART_EVENT, refresh)
    return () => window.removeEventListener(CART_EVENT, refresh)
  }, [])

  const total = items.reduce((sum, item) => sum + item.price_fcfa * item.quantity, 0)

  if (!loaded) return null

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#1C2021] flex flex-col">
        <Navbar />

        <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
          <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

          <div className="bg-[#1C2021] rounded-lg border border-[#35383C] p-8 text-center">
            <div className="mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FDC700"
                strokeWidth="1.5"
                className="mx-auto mb-4"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h2 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-3">Panier vide</h2>
            <p className="text-[#B3B8BE] mb-8">Explorez notre catalogue et ajoutez vos produits préférés.</p>
            <Link href="/products">
              <Button variant="primary">Continuer les achats</Button>
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#1C2021] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map(item => (
              <div key={`${item.id}-${item.variant_id || 'default'}`} className="bg-[#1C2021] rounded-lg border border-[#35383C] p-4 flex gap-4 items-center">
                <Link href={`/products/${item.slug}`} className="w-20 h-20 rounded-lg bg-[#171A1C] border border-[#35383C] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug}`} className="font-semibold text-[#EEF2F7] hover:text-[#FDC700] transition-colors line-clamp-1">
                    {item.name}
                  </Link>
                  {item.variant_label && (
                    <p className="text-xs text-[#8E959D] mt-0.5">{item.variant_label}</p>
                  )}
                  <p className="text-sm text-[#8E959D] mt-1">{formatAmount(item.price_fcfa)} FCFA</p>
                </div>

                <div className="flex items-center border-2 border-[#4E5257] rounded-full flex-shrink-0">
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity - 1, item.variant_id)}
                    className="w-8 h-8 flex items-center justify-center text-[#EEF2F7] hover:text-[#FDC700]"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity + 1, item.variant_id)}
                    className="w-8 h-8 flex items-center justify-center text-[#EEF2F7] hover:text-[#FDC700]"
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right font-semibold text-[#EEF2F7] flex-shrink-0">
                  {(formatAmount(item.price_fcfa * item.quantity))} FCFA
                </div>

                <button
                  onClick={() => removeFromCart(item.id, item.variant_id)}
                  className="text-[#8E959D] hover:text-red-600 transition-colors flex-shrink-0"
                  aria-label="Retirer du panier"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="bg-[#1C2021] rounded-lg border border-[#35383C] p-6 sticky top-6">
              <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-6">Résumé</h2>
              <div className="flex justify-between text-[#B3B8BE] mb-2">
                <span>Produits</span>
                <span>{formatAmount(total)} FCFA</span>
              </div>
              <p className="text-xs text-[#8E959D] mb-6">
                Frais de livraison calculés à l&apos;étape suivante selon votre ville.
              </p>
              <div className="flex justify-between text-lg font-bold text-[#EEF2F7] pt-4 border-t border-[#35383C] mb-6">
                <span>Total</span>
                <span className="text-[#FDC700]">{formatAmount(total)} FCFA</span>
              </div>
              <Link href="/checkout">
                <Button variant="primary" className="w-full">
                  Passer commande
                </Button>
              </Link>
              <Link href="/products" className="block text-center text-sm text-[#FDC700] hover:underline mt-4">
                Continuer les achats
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
