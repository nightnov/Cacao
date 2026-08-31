'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { getCart, updateCartItemQuantity, removeFromCart, CartItem, CART_EVENT } from '@/lib/cart'
import { formatAmount } from '@/lib/format'
import { getSupabaseClient } from '@/lib/supabase'
import {
  volumeDiscount,
  DEFAULT_VOLUME_DISCOUNT,
  type VolumeDiscountSettings,
} from '@/lib/delivery'

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [volume, setVolume] = useState<VolumeDiscountSettings>(DEFAULT_VOLUME_DISCOUNT)

  useEffect(() => {
    const refresh = () => setItems(getCart())
    refresh()
    setLoaded(true)
    window.addEventListener(CART_EVENT, refresh)
    return () => window.removeEventListener(CART_EVENT, refresh)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', [
            'volume_discount_enabled',
            'volume_discount_threshold_fcfa',
            'volume_discount_percent',
          ])
        const s = Object.fromEntries((data || []).map(r => [r.key, r.value]))
        const threshold = Number(s.volume_discount_threshold_fcfa)
        const percent = Number(s.volume_discount_percent)
        setVolume({
          enabled: s.volume_discount_enabled !== 'false',
          thresholdFcfa: Number.isFinite(threshold)
            ? threshold
            : DEFAULT_VOLUME_DISCOUNT.thresholdFcfa,
          percent: Number.isFinite(percent) ? percent : DEFAULT_VOLUME_DISCOUNT.percent,
        })
      } catch {
        // Réglages illisibles : on garde les valeurs par défaut plutôt que de
        // retirer une remise à laquelle le client a peut-être droit.
      }
    }
    load()
  }, [])

  const total = items.reduce((sum, item) => sum + item.price_fcfa * item.quantity, 0)

  // Affichage seulement : le montant prélevé est recalculé au paiement.
  const discount = volumeDiscount(volume, total)
  const missingForDiscount = Math.max(0, volume.thresholdFcfa - total)

  if (!loaded) return null

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-bg-panel flex flex-col">
        <Navbar />

        <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
          <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

          <div className="bg-bg-panel rounded-lg border border-border p-8 text-center">
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
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">Panier vide</h2>
            <p className="text-ink-dim mb-8">Explorez notre catalogue et ajoutez vos produits préférés.</p>
            <Link href="/products">
              <Button variant="sober">Continuer les achats</Button>
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-panel flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map(item => (
              <div key={`${item.id}-${item.variant_id || 'default'}`} className="bg-bg-panel rounded-lg border border-border p-4 flex gap-4 items-center">
                <Link href={`/products/${item.slug}`} className="w-20 h-20 rounded-lg bg-bg-sunken border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
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
                  <Link href={`/products/${item.slug}`} className="font-semibold text-ink hover:text-ink transition-colors line-clamp-1">
                    {item.name}
                  </Link>
                  {item.variant_label && (
                    <p className="text-xs text-ink-dimmer mt-0.5">{item.variant_label}</p>
                  )}
                  <p className="text-sm text-ink-dimmer mt-1">{formatAmount(item.price_fcfa)} FCFA</p>
                </div>

                <div className="flex items-center border-2 border-border-strong rounded-full flex-shrink-0">
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity - 1, item.variant_id)}
                    className="w-8 h-8 flex items-center justify-center text-ink hover:text-ink"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateCartItemQuantity(item.id, item.quantity + 1, item.variant_id)}
                    className="w-8 h-8 flex items-center justify-center text-ink hover:text-ink"
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right font-semibold text-ink flex-shrink-0">
                  {(formatAmount(item.price_fcfa * item.quantity))} FCFA
                </div>

                <button
                  onClick={() => removeFromCart(item.id, item.variant_id)}
                  className="text-ink-dimmer hover:text-danger transition-colors flex-shrink-0"
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
            <div className="bg-bg-panel rounded-lg border border-border p-6 sticky top-6">
              <h2 className="font-serif font-semibold text-xl text-ink mb-6">Résumé</h2>
              <div className="flex justify-between text-ink-dim mb-2">
                <span>Produits</span>
                <span>{formatAmount(total)} FCFA</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-bright mb-2">
                  <span>Remise gros panier (−{volume.percent} %)</span>
                  <span>−{formatAmount(discount)} FCFA</span>
                </div>
              )}

              {/* Rien n'est demandé au client : la remise tombe d'elle-même.
                  On indique seulement ce qu'il manque, quand c'est atteignable. */}
              {discount === 0 && volume.enabled && missingForDiscount > 0 && (
                <div className="bg-bg-raised border border-border rounded-lg px-3 py-2.5 mb-2">
                  <p className="text-xs text-ink-dim">
                    Plus que{' '}
                    <strong className="text-ink">{formatAmount(missingForDiscount)} FCFA</strong>{' '}
                    d&apos;articles pour obtenir {volume.percent} % de remise automatique.
                  </p>
                </div>
              )}

              <p className="text-xs text-ink-dimmer mb-6 mt-2">
                Frais de livraison calculés à l&apos;étape suivante selon votre ville.
              </p>
              <div className="flex justify-between text-lg font-bold text-ink pt-4 border-t border-border mb-6">
                <span>Total</span>
                <span className="text-ink">{formatAmount(total - discount)} FCFA</span>
              </div>
              <Link href="/checkout">
                <Button variant="solid" className="w-full">
                  Passer commande
                </Button>
              </Link>
              <Link href="/products" className="block text-center text-sm text-ink hover:underline mt-4">
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
