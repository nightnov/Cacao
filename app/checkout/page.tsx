'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { getCart, clearCart, CartItem } from '@/lib/cart'
import { formatAmount } from '@/lib/format'
import {
  quoteDelivery,
  accuracyIsUsable,
  DEFAULT_TARIFF,
  type DeliveryTariff,
} from '@/lib/delivery'
import { MapPin, LocateFixed, Check } from 'lucide-react'

interface ShippingFee {
  id: string
  city: string
  price_fcfa: number
}

function generateOrderNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CMD-${datePart}-${randomPart}`
}

function generateDeliveryCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export default function Checkout() {
  const router = useRouter()
  const { user, loading: authLoading, isLoggedIn } = useAuth()

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [shippingFees, setShippingFees] = useState<ShippingFee[]>([])
  const [loadingFees, setLoadingFees] = useState(true)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [tariff, setTariff] = useState<DeliveryTariff>(DEFAULT_TARIFF)
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  )
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null)
  const [promoError, setPromoError] = useState('')
  const [checkingPromo, setCheckingPromo] = useState(false)

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/account/login')
    }
  }, [authLoading, isLoggedIn, router])

  useEffect(() => {
    const items = getCart()
    setCartItems(items)
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [router])

  useEffect(() => {
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      setFullName(`${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim())
    }
  }, [user])

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const supabase = getSupabaseClient()
        const [feesRes, tariffRes] = await Promise.all([
          supabase
            .from('shipping_fees')
            .select('id, city, price_fcfa, parent_city, is_active, sort_order')
            .order('sort_order')
            .order('city'),
          supabase
            .from('site_settings')
            .select('key, value')
            .in('key', [
              'pickup_lat',
              'pickup_lng',
              'delivery_base_fcfa',
              'delivery_per_km_fcfa',
              'delivery_road_factor',
              'delivery_min_fcfa',
              'delivery_max_fcfa',
            ]),
        ])

        if (feesRes.error) throw feesRes.error

        // `is_active` n'existe qu'après la migration 025 : tant qu'elle n'est
        // pas passée, la colonne est absente et toutes les zones sont gardées.
        const zones = (feesRes.data || []).filter(f => f.is_active !== false)
        setShippingFees(zones)
        if (zones.length > 0) setCityId(zones[0].id)

        const s = Object.fromEntries((tariffRes.data || []).map(r => [r.key, r.value]))
        const num = (v: unknown, fallback: number) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : fallback
        }
        setTariff({
          pickupLat: s.pickup_lat ? num(s.pickup_lat, NaN) : null,
          pickupLng: s.pickup_lng ? num(s.pickup_lng, NaN) : null,
          baseFcfa: num(s.delivery_base_fcfa, DEFAULT_TARIFF.baseFcfa),
          perKmFcfa: num(s.delivery_per_km_fcfa, DEFAULT_TARIFF.perKmFcfa),
          roadFactor: num(s.delivery_road_factor, DEFAULT_TARIFF.roadFactor),
          minFcfa: num(s.delivery_min_fcfa, DEFAULT_TARIFF.minFcfa),
          maxFcfa: num(s.delivery_max_fcfa, DEFAULT_TARIFF.maxFcfa),
        })
      } catch (err) {
        console.error('Erreur chargement villes:', err)
      } finally {
        setLoadingFees(false)
      }
    }

    fetchFees()
  }, [])

  /**
   * Vérifie le code auprès du serveur. La réponse ne sert qu'à afficher la
   * remise : le montant prélevé est recalculé indépendamment au paiement, donc
   * une réponse truquée ici ne ferait pas payer moins.
   */
  const applyPromo = async () => {
    const code = promoInput.trim()
    if (!code) return
    setCheckingPromo(true)
    setPromoError('')
    try {
      const supabase = getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          code,
          city: selectedCity?.city || null,
          items: cartItems.map(i => ({
            product_id: i.id,
            variant_id: i.variant_id || null,
            quantity: i.quantity,
          })),
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        setPromo(null)
        setPromoError(json.reason || "Ce code n'est pas valable.")
        return
      }
      setPromo({ code: json.code, discount: json.discount })
      setPromoInput('')
    } catch {
      setPromoError('Vérification impossible pour le moment.')
    } finally {
      setCheckingPromo(false)
    }
  }

  /**
   * Demande la position au navigateur.
   *
   * Rien n'est envoyé tant que le client n'a pas accepté : c'est lui qui voit
   * la demande d'autorisation, et un refus n'empêche pas de commander — le
   * tarif de la commune prend le relais.
   */
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError("Votre navigateur ne sait pas transmettre votre position.")
      return
    }
    setLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
        setLocating(false)

        // Une position à plus de deux kilomètres près désignerait une autre
        // commune, donc un autre prix. Mieux vaut la refuser que facturer faux.
        if (!accuracyIsUsable(accuracy)) {
          setLocationError(
            `Position trop imprécise (${Math.round(accuracy)} m). Activez le GPS de votre téléphone, ou choisissez votre commune ci-dessous.`
          )
          return
        }
        setPosition({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) })
      },
      err => {
        setLocating(false)
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Position refusée. Choisissez simplement votre commune ci-dessous.'
            : "Position indisponible. Choisissez votre commune ci-dessous."
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const productsTotal = cartItems.reduce((sum, item) => sum + item.price_fcfa * item.quantity, 0)
  const selectedCity = shippingFees.find(f => f.id === cityId)

  // Le même calcul que le serveur, à titre d'affichage seulement : le montant
  // réellement prélevé est recalculé au paiement à partir des données en base.
  const quote = quoteDelivery(tariff, position, selectedCity?.price_fcfa ?? null)
  const shippingCost = quote.fcfa

  // Ces montants ne servent qu'à l'affichage. Le total réellement prélevé est
  // recalculé par le serveur à partir des prix en base, dans
  // app/api/payment/initiate/route.ts.
  const discount = promo?.discount || 0
  const total = Math.max(0, productsTotal + shippingCost - discount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedCity) {
      setError('Veuillez sélectionner une ville de livraison')
      return
    }

    setSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      const orderNumber = generateOrderNumber()
      const deliveryCode = generateDeliveryCode()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending',
          total_products_fcfa: productsTotal,
          shipping_cost_fcfa: shippingCost,
          total_fcfa: total,
          promo_code: promo?.code || null,
          discount_fcfa: discount,
          delivery_lat: position?.lat ?? null,
          delivery_lng: position?.lng ?? null,
          delivery_accuracy_m: position?.accuracy ?? null,
          delivery_distance_km: quote.km,
          delivery_method: quote.method,
          payment_method: 'pending',
          delivery_code: deliveryCode,
          notes: notes.trim() || null,
          shipping_address: {
            full_name: fullName,
            phone,
            city: selectedCity.city,
            address
          }
        }])
        .select()
        .single()

      if (orderError) throw orderError

      const orderItemsPayload = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        unit_price_fcfa: item.price_fcfa,
        quantity: item.quantity,
        subtotal_fcfa: item.price_fcfa * item.quantity,
        variant_id: item.variant_id || null,
        variant_label: item.variant_label || null
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload)
      if (itemsError) throw itemsError

      const initiateResponse = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber,
          items: cartItems.map(item => ({
            name: item.variant_label ? `${item.name} (${item.variant_label})` : item.name,
            price_fcfa: item.price_fcfa,
            quantity: item.quantity
          })),
          phone,
          fullName
        })
      })

      const initiateResult = await initiateResponse.json()

      if (!initiateResponse.ok || !initiateResult.url) {
        throw new Error(initiateResult.error || 'Le paiement n\'a pas pu être initié. Votre commande est enregistrée, contactez-nous.')
      }

      clearCart()
      window.location.href = initiateResult.url
    } catch (err: any) {
      setError(err.message || 'Une erreur s\'est produite lors de la commande')
      setSubmitting(false)
    }
  }

  if (authLoading || cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-bg-panel flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-panel flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Finaliser la commande</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-bg-panel rounded-lg border border-border p-6">
              <h2 className="font-serif font-semibold text-xl text-ink mb-6">Livraison</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Nom complet *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Téléphone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="07 00 00 00 00"
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>

                {/* Position : proposée d'abord, parce qu'elle donne le prix le
                    plus juste. Jamais imposée — le choix manuel reste visible
                    en dessous, qu'on l'utilise ou non. */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Votre position
                  </label>

                  {position ? (
                    <div className="bg-green/10 border border-green rounded-lg p-3.5">
                      <p className="text-sm text-ink flex items-center gap-2">
                        <Check size={15} className="text-green-bright flex-shrink-0" />
                        Position enregistrée
                        <span className="text-ink-dimmer text-[12px]">
                          (à {position.accuracy} m près)
                        </span>
                      </p>
                      {quote.method === 'distance' && quote.km !== null && (
                        <p className="text-[12px] text-ink-dim mt-1.5">
                          Environ {quote.km} km de trajet — livraison{' '}
                          {formatAmount(quote.fcfa)} FCFA
                          {quote.capped && ' (tarif plafonné)'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setPosition(null)}
                        className="text-[12px] text-ink-dimmer hover:text-ink underline mt-2"
                      >
                        Retirer ma position
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border-strong hover:border-gold disabled:opacity-50 text-ink rounded-lg font-semibold text-sm transition-colors"
                      >
                        <LocateFixed size={16} className="text-gold" />
                        {locating ? 'Recherche…' : 'Utiliser ma position'}
                      </button>
                      <p className="text-[12px] text-ink-dimmer mt-1.5">
                        Facultatif. Permet de calculer le prix exact de votre livraison et aide le
                        livreur à vous trouver. Vous pouvez aussi choisir votre commune ci-dessous.
                      </p>
                    </>
                  )}

                  {locationError && (
                    <p className="text-[12px] text-danger mt-1.5">{locationError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Commune ou ville *
                  </label>
                  {loadingFees ? (
                    <div className="h-11 bg-bg-sunken rounded-lg animate-pulse"></div>
                  ) : shippingFees.length > 0 ? (
                    <>
                      <select
                        value={cityId}
                        onChange={(e) => setCityId(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-bg-raised border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        {shippingFees.map(fee => (
                          <option key={fee.id} value={fee.id}>
                            {fee.city}
                            {/* Le tarif de la commune n'a plus de sens à afficher
                                quand le prix vient de la distance : il induirait
                                en erreur sur ce qui sera facturé. */}
                            {quote.method !== 'distance' &&
                              ` · ${formatAmount(fee.price_fcfa)} FCFA`}
                          </option>
                        ))}
                      </select>
                      {quote.method === 'distance' && (
                        <p className="text-[12px] text-ink-dimmer mt-1.5 flex items-start gap-1.5">
                          <MapPin size={13} className="text-gold flex-shrink-0 mt-0.5" />
                          Le prix est calculé sur la distance réelle depuis votre position, pas sur
                          le tarif de la commune.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-ink-dimmer">Aucune zone de livraison configurée pour le moment.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Adresse détaillée *</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={3}
                    placeholder="Quartier, rue, repère..."
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Notes de commande <span className="font-normal text-ink-dimmer">(optionnel)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Instructions spéciales, informations complémentaires..."
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-bg-panel rounded-lg border border-border p-6">
              <h2 className="font-serif font-semibold text-xl text-ink mb-3">Paiement</h2>
              <p className="text-sm text-ink-dim">
                Le paiement par Mobile Money (MoneyFusion) arrive très prochainement. Votre commande sera enregistrée et notre équipe vous contactera pour organiser le règlement et la livraison.
              </p>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-bg-panel rounded-lg border border-border p-6 sticky top-6">
              <h2 className="font-serif font-semibold text-xl text-ink mb-6">Votre commande</h2>

              <div className="space-y-3 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-dim">{item.name} × {item.quantity}</span>
                    <span className="text-ink font-medium">
                      {(formatAmount(item.price_fcfa * item.quantity))} FCFA
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm text-ink-dim">
                  <span>Produits</span>
                  <span>{formatAmount(productsTotal)} FCFA</span>
                </div>
                <div className="flex justify-between text-sm text-ink-dim">
                  <span>Livraison</span>
                  <span>{formatAmount(shippingCost)} FCFA</span>
                </div>

                {promo && (
                  <div className="flex justify-between text-sm text-green-bright">
                    <span className="flex items-center gap-2">
                      Remise ({promo.code})
                      <button
                        type="button"
                        onClick={() => {
                          setPromo(null)
                          setPromoError('')
                        }}
                        className="text-ink-dimmer hover:text-ink underline text-[12px]"
                      >
                        retirer
                      </button>
                    </span>
                    <span>−{formatAmount(promo.discount)} FCFA</span>
                  </div>
                )}

                {!promo && (
                  <div className="pt-1">
                    <div className="flex gap-2">
                      <input
                        value={promoInput}
                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            applyPromo()
                          }
                        }}
                        placeholder="Code de réduction"
                        className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-bg-raised border border-border-mid rounded-lg text-ink outline-none focus:border-gold transition-colors"
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={checkingPromo || !promoInput.trim()}
                        className="px-4 py-2 text-[13px] font-bold rounded-lg border border-border-strong text-ink hover:border-gold disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        {checkingPromo ? '…' : 'Appliquer'}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[12px] text-danger mt-1.5">{promoError}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold text-ink pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-gold">{formatAmount(total)} FCFA</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-6"
                disabled={submitting || shippingFees.length === 0}
              >
                {submitting ? 'Envoi en cours...' : 'Confirmer la commande'}
              </Button>

              <Link href="/cart" className="block text-center text-sm text-gold hover:underline mt-4">
                Retour au panier
              </Link>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </main>
  )
}
