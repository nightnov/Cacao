'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { formatAmount } from '@/lib/format'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price_fcfa: number
  subtotal_fcfa: number
  variant_label?: string | null
}

interface Order {
  id: string
  order_number: string
  total_products_fcfa: number
  shipping_cost_fcfa: number
  total_fcfa: number
  delivery_code: string | null
  shipping_address: { full_name: string; phone: string; city: string; address: string }
  created_at: string
}

export default function CheckoutSuccess() {
  const params = useParams()
  const orderNumber = params.orderNumber as string
  const { isLoggedIn, loading: authLoading } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, total_products_fcfa, shipping_cost_fcfa, total_fcfa, delivery_code, shipping_address, created_at')
          .eq('order_number', orderNumber)
          .maybeSingle()

        if (orderError) throw orderError
        if (!orderData) {
          setNotFound(true)
          return
        }

        setOrder(orderData as unknown as Order)

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('id, product_name, quantity, unit_price_fcfa, subtotal_fcfa, variant_label')
          .eq('order_id', orderData.id)

        if (itemsError) throw itemsError
        setItems(itemsData || [])
      } catch (err) {
        console.error('Erreur chargement commande:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && isLoggedIn && orderNumber) fetchOrder()
    else if (!authLoading && !isLoggedIn) setLoading(false)
  }, [orderNumber, authLoading, isLoggedIn])

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#1C2021] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FDC700] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  if (notFound || !order) {
    return (
      <main className="min-h-screen bg-[#1C2021] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-24 text-center">
          <h1 className="font-serif font-semibold text-3xl text-[#EEF2F7] mb-3">Commande introuvable</h1>
          <p className="text-[#B3B8BE] mb-8">Nous n&apos;avons pas trouvé cette commande.</p>
          <Link href="/products">
            <Button variant="primary">Retour au catalogue</Button>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#1C2021] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-16">
        <div className="bg-[#1C2021] rounded-lg border border-[#35383C] p-8">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3FCE7A" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] text-center mb-2">
            Commande confirmée
          </h1>
          <p className="text-[#B3B8BE] text-center mb-8">
            Numéro de commande : <span className="font-semibold text-[#EEF2F7]">{order.order_number}</span>
          </p>

          <div className="bg-[#171A1C] rounded-lg p-4 border border-[#35383C] mb-6">
            <p className="text-sm text-[#B3B8BE]">
              Votre commande a bien été enregistrée. Notre équipe vous contactera au{' '}
              <strong>{order.shipping_address.phone}</strong> pour organiser le paiement et la livraison à{' '}
              <strong>{order.shipping_address.city}</strong>.
            </p>
          </div>

          {order.delivery_code && (
            <div className="bg-[#2A2418] border border-[#FDC700]/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-xs font-semibold text-[#FDC700] uppercase mb-1">Code de livraison</p>
              <p className="text-3xl font-bold text-[#EEF2F7] tracking-widest mb-2">{order.delivery_code}</p>
              <p className="text-xs text-[#B3B8BE]">
                Gardez ce code précieusement. Ne le donnez au livreur qu&apos;au moment où il vous remet votre colis. Cela confirme que vous avez bien reçu votre commande.
              </p>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#B3B8BE]">
                  {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ''} × {item.quantity}
                </span>
                <span className="text-[#EEF2F7] font-medium">
                  {formatAmount(item.subtotal_fcfa)} FCFA
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#35383C] pt-4 space-y-2">
            <div className="flex justify-between text-sm text-[#B3B8BE]">
              <span>Produits</span>
              <span>{formatAmount(order.total_products_fcfa)} FCFA</span>
            </div>
            <div className="flex justify-between text-sm text-[#B3B8BE]">
              <span>Livraison</span>
              <span>{formatAmount(order.shipping_cost_fcfa)} FCFA</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#EEF2F7] pt-2 border-t border-[#35383C]">
              <span>Total</span>
              <span className="text-[#FDC700]">{formatAmount(order.total_fcfa)} FCFA</span>
            </div>
          </div>

          <Link href="/products" className="block mt-8">
            <Button variant="outline" className="w-full">Continuer les achats</Button>
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  )
}
