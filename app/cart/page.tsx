'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { getCart, updateCartItemQuantity, removeFromCart, CartItem, CART_EVENT } from '@/lib/cart'

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
      <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
        <Navbar />

        <div className="flex-1 max-w-4xl mx-auto px-10 py-16 w-full">
          <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

          <div className="bg-white rounded-lg border border-[#E4DDCF] p-8 text-center">
            <div className="mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E85D25"
                strokeWidth="1.5"
                className="mx-auto mb-4"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-3">Panier vide</h2>
            <p className="text-[#56534C] mb-8">Explorez notre catalogue et ajoutez vos produits préférés.</p>
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
    <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-[#E4DDCF] p-4 flex gap-4 items-center">
                <Link href={`/products/${item.slug}`} className="w-20 h-20 rounded-lg bg-[#FBF6EE] border border-[#E4DDCF] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug}`} className="font-semibold text-[#1A1A1A] hover:text-[#E85D25] transition-colors line-clamp-1">
                    {item.name}
                  </Link>
                  <p className="text-sm text-[#8A8579] mt-1">{item.price_fcfa.toLocaleString('fr-CI')} FCFA</p>
                </div>

                <div className="flex items-center border-2 border-[#1A1A1A] rounded-full flex-shrink-0">
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] hover:text-[#E85D25]"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] hover:text-[#E85D25]"
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right font-semibold text-[#1A1A1A] flex-shrink-0">
                  {(item.price_fcfa * item.quantity).toLocaleString('fr-CI')} FCFA
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-[#8A8579] hover:text-red-600 transition-colors flex-shrink-0"
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
            <div className="bg-white rounded-lg border border-[#E4DDCF] p-6 sticky top-6">
              <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-6">Résumé</h2>
              <div className="flex justify-between text-[#56534C] mb-2">
                <span>Produits</span>
                <span>{total.toLocaleString('fr-CI')} FCFA</span>
              </div>
              <p className="text-xs text-[#8A8579] mb-6">
                Frais de livraison calculés à l&apos;étape suivante selon votre ville.
              </p>
              <div className="flex justify-between text-lg font-bold text-[#1A1A1A] pt-4 border-t border-[#E4DDCF] mb-6">
                <span>Total</span>
                <span className="text-[#E85D25]">{total.toLocaleString('fr-CI')} FCFA</span>
              </div>
              <Button variant="primary" className="w-full" disabled>
                Passer commande (bientôt)
              </Button>
              <Link href="/products" className="block text-center text-sm text-[#E85D25] hover:underline mt-4">
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
