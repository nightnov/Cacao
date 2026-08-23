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
        const { data, error: feesError } = await supabase
          .from('shipping_fees')
          .select('id, city, price_fcfa')
          .order('city', { ascending: true })

        if (feesError) throw feesError
        setShippingFees(data || [])
        if (data && data.length > 0) setCityId(data[0].id)
      } catch (err) {
        console.error('Erreur chargement villes:', err)
      } finally {
        setLoadingFees(false)
      }
    }

    fetchFees()
  }, [])

  const productsTotal = cartItems.reduce((sum, item) => sum + item.price_fcfa * item.quantity, 0)
  const selectedCity = shippingFees.find(f => f.id === cityId)
  const shippingCost = selectedCity?.price_fcfa || 0
  const total = productsTotal + shippingCost

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
          totalFcfa: total,
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
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C2410C] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Finaliser la commande</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-[#E8E0D8] p-6">
              <h2 className="font-serif font-semibold text-xl text-[#241A14] mb-6">Livraison</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#241A14] mb-2">Nom complet *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#241A14] mb-2">Téléphone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="07 00 00 00 00"
                    className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#241A14] mb-2">Ville *</label>
                  {loadingFees ? (
                    <div className="h-11 bg-[#FAF7F4] rounded-lg animate-pulse"></div>
                  ) : shippingFees.length > 0 ? (
                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    >
                      {shippingFees.map(fee => (
                        <option key={fee.id} value={fee.id}>
                          {fee.city} · {fee.price_fcfa.toLocaleString("fr-CI")} FCFA
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-[#7D6A5D]">Aucune ville de livraison configurée pour le moment.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#241A14] mb-2">Adresse détaillée *</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={3}
                    placeholder="Quartier, rue, repère..."
                    className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#241A14] mb-2">
                    Notes de commande <span className="font-normal text-[#7D6A5D]">(optionnel)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Instructions spéciales, informations complémentaires..."
                    className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E8E0D8] p-6">
              <h2 className="font-serif font-semibold text-xl text-[#241A14] mb-3">Paiement</h2>
              <p className="text-sm text-[#5B4B41]">
                Le paiement par Mobile Money (MoneyFusion) arrive très prochainement. Votre commande sera enregistrée et notre équipe vous contactera pour organiser le règlement et la livraison.
              </p>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-lg border border-[#E8E0D8] p-6 sticky top-6">
              <h2 className="font-serif font-semibold text-xl text-[#241A14] mb-6">Votre commande</h2>

              <div className="space-y-3 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[#5B4B41]">{item.name} × {item.quantity}</span>
                    <span className="text-[#241A14] font-medium">
                      {(formatAmount(item.price_fcfa * item.quantity))} FCFA
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#E8E0D8] pt-4 space-y-2">
                <div className="flex justify-between text-sm text-[#5B4B41]">
                  <span>Produits</span>
                  <span>{formatAmount(productsTotal)} FCFA</span>
                </div>
                <div className="flex justify-between text-sm text-[#5B4B41]">
                  <span>Livraison</span>
                  <span>{formatAmount(shippingCost)} FCFA</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-[#241A14] pt-2 border-t border-[#E8E0D8]">
                  <span>Total</span>
                  <span className="text-[#C2410C]">{formatAmount(total)} FCFA</span>
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

              <Link href="/cart" className="block text-center text-sm text-[#C2410C] hover:underline mt-4">
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
