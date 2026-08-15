'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'

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
          .select('id, order_number, total_products_fcfa, shipping_cost_fcfa, total_fcfa, shipping_address, created_at')
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
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  if (notFound || !order) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-10 py-24 text-center">
          <h1 className="font-serif font-semibold text-3xl text-[#1A1A1A] mb-3">Commande introuvable</h1>
          <p className="text-[#56534C] mb-8">Nous n&apos;avons pas trouvé cette commande.</p>
          <Link href="/products">
            <Button variant="primary">Retour au catalogue</Button>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-10 py-16">
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-8">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E7A46" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] text-center mb-2">
            Commande confirmée
          </h1>
          <p className="text-[#56534C] text-center mb-8">
            Numéro de commande : <span className="font-semibold text-[#1A1A1A]">{order.order_number}</span>
          </p>

          <div className="bg-[#FBF6EE] rounded-lg p-4 border border-[#E4DDCF] mb-6">
            <p className="text-sm text-[#56534C]">
              Votre commande a bien été enregistrée. Notre équipe vous contactera au{' '}
              <strong>{order.shipping_address.phone}</strong> pour organiser le paiement et la livraison à{' '}
              <strong>{order.shipping_address.city}</strong>.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#56534C]">
                  {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ''} × {item.quantity}
                </span>
                <span className="text-[#1A1A1A] font-medium">
                  {item.subtotal_fcfa.toLocaleString('fr-CI')} FCFA
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E4DDCF] pt-4 space-y-2">
            <div className="flex justify-between text-sm text-[#56534C]">
              <span>Produits</span>
              <span>{order.total_products_fcfa.toLocaleString('fr-CI')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm text-[#56534C]">
              <span>Livraison</span>
              <span>{order.shipping_cost_fcfa.toLocaleString('fr-CI')} FCFA</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#1A1A1A] pt-2 border-t border-[#E4DDCF]">
              <span>Total</span>
              <span className="text-[#FF6600]">{order.total_fcfa.toLocaleString('fr-CI')} FCFA</span>
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
