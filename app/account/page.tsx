'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Profile {
  phone: string | null
  address: string | null
  city: string | null
}

interface OrderItem {
  id: string
  order_id: string
  product_name: string
  quantity: number
  unit_price_fcfa: number
  subtotal_fcfa: number
}

interface Order {
  id: string
  order_number: string
  status: string
  total_fcfa: number
  total_products_fcfa: number
  shipping_cost_fcfa: number
  created_at: string
  delivery_code: string | null
  shipping_address: { city: string; address: string } | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'Préparation', color: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Remboursée', color: 'bg-red-100 text-red-700' }
}

export default function Account() {
  const router = useRouter()
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()

  const [profile, setProfile] = useState<Profile>({ phone: '', address: '', city: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({})
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/account/login')
    }
  }, [authLoading, isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn || !user) return

    const fetchData = async () => {
      try {
        const supabase = getSupabaseClient()

        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone, address, city')
          .eq('id', user.id)
          .maybeSingle()

        if (profileData) {
          setProfile({
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || ''
          })
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, status, total_fcfa, total_products_fcfa, shipping_cost_fcfa, created_at, delivery_code, shipping_address')
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError
        setOrders((ordersData as unknown as Order[]) || [])

        if (ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map((o: any) => o.id)
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('id, order_id, product_name, quantity, unit_price_fcfa, subtotal_fcfa')
            .in('order_id', orderIds)

          if (itemsError) throw itemsError

          const grouped: Record<string, OrderItem[]> = {}
          for (const item of (itemsData as OrderItem[]) || []) {
            if (!grouped[item.order_id]) grouped[item.order_id] = []
            grouped[item.order_id].push(item)
          }
          setItemsByOrder(grouped)
        }
      } catch (err) {
        console.error('Erreur chargement compte:', err)
      } finally {
        setLoadingOrders(false)
      }
    }

    fetchData()
  }, [isLoggedIn, user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSaved(false)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('profiles')
        .update({ phone: profile.phone, address: profile.address, city: profile.city })
        .eq('id', user.id)

      if (error) throw error
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      console.error('Erreur enregistrement profil:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  if (authLoading || !isLoggedIn) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Mon compte</h1>

        {/* Profile */}
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-8 mb-8">
          <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">
            {firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : 'Bienvenue'}
          </h2>
          <p className="text-[#56534C] mb-6">{user?.email}</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="07 00 00 00 00"
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Ville</label>
                <input
                  type="text"
                  value={profile.city || ''}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                  placeholder="Abidjan"
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Adresse</label>
              <input
                type="text"
                value={profile.address || ''}
                onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                placeholder="Quartier, rue, repère..."
                className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" variant="primary" disabled={savingProfile}>
                {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              {profileSaved && <span className="text-sm text-[#1E7A46] font-semibold">✓ Enregistré</span>}
              <Button type="button" variant="outline" onClick={logout} className="ml-auto">
                Déconnexion
              </Button>
            </div>
          </form>
        </div>

        {/* Order history */}
        <div>
          <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-4">Mes commandes</h2>

          {loadingOrders ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-6 animate-pulse">
                  <div className="h-4 bg-[#E4DDCF] rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-[#E4DDCF] rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E4DDCF] p-8 text-center">
              <p className="text-[#56534C]">Vous n&apos;avez pas encore passé de commande.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const status = statusLabels[order.status] || statusLabels.pending
                const isExpanded = expandedOrder === order.id
                const items = itemsByOrder[order.id] || []

                return (
                  <div key={order.id} className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FBF6EE] transition-colors text-left"
                    >
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{order.order_number}</p>
                        <p className="text-xs text-[#8A8579]">
                          {new Date(order.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="font-semibold text-[#1A1A1A]">
                          {order.total_fcfa.toLocaleString('fr-CI')} FCFA
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-[#8A8579] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#E4DDCF] px-6 py-4 bg-[#FBF6EE]">
                        <div className="space-y-2 mb-4">
                          {items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-[#56534C]">{item.product_name} × {item.quantity}</span>
                              <span className="text-[#1A1A1A] font-medium">
                                {item.subtotal_fcfa.toLocaleString('fr-CI')} FCFA
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.shipping_address && (
                          <p className="text-xs text-[#8A8579] mb-3">
                            Livraison à {order.shipping_address.city} — {order.shipping_address.address}
                          </p>
                        )}

                        {order.delivery_code && !['delivered', 'cancelled', 'refunded'].includes(order.status) && (
                          <div className="bg-orange-50 border border-[#FF6600]/30 rounded-lg p-3 mb-3 text-center">
                            <p className="text-[10px] font-semibold text-[#FF6600] uppercase mb-0.5">Code de livraison</p>
                            <p className="text-xl font-bold text-[#1A1A1A] tracking-widest">{order.delivery_code}</p>
                            <p className="text-[10px] text-[#56534C] mt-1">
                              À donner au livreur uniquement à la remise du colis
                            </p>
                          </div>
                        )}

                        <div className="border-t border-[#E4DDCF] pt-3 space-y-1">
                          <div className="flex justify-between text-xs text-[#56534C]">
                            <span>Produits</span>
                            <span>{order.total_products_fcfa.toLocaleString('fr-CI')} FCFA</span>
                          </div>
                          <div className="flex justify-between text-xs text-[#56534C]">
                            <span>Livraison</span>
                            <span>{order.shipping_cost_fcfa.toLocaleString('fr-CI')} FCFA</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
