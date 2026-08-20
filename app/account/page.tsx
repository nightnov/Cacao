'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, ShoppingBag, MapPin, Heart, Settings, HelpCircle } from 'lucide-react'
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

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  preparing: { label: 'En préparation', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  refunded: { label: 'Remboursée', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
}

interface AccountSection {
  key: string
  label: string
  icon: typeof User
  href?: string
}

const sections: AccountSection[] = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'orders', label: 'Commandes', icon: ShoppingBag },
  { key: 'addresses', label: 'Adresses', icon: MapPin },
  { key: 'favorites', label: 'Favoris', icon: Heart, href: '/account/favorites' },
  { key: 'settings', label: 'Paramètres', icon: Settings },
  { key: 'help', label: 'Aide', icon: HelpCircle }
]

export default function Account() {
  const router = useRouter()
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<string>('profile')

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
  const displayName = firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : 'Bienvenue'
  const avatarLetter = (firstName || user?.email || '?').charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto px-10 py-16 w-full">
        {/* En-tête */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-full bg-[#1A1A1A] text-white text-xl font-semibold flex items-center justify-center flex-shrink-0">
            {avatarLetter}
          </div>
          <div>
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A]">{displayName}</h1>
            <p className="text-sm text-[#8A8579]">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-10">
          {/* Navigation latérale (desktop) / sections (mobile) */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {sections.map(section => {
              const Icon = section.icon
              if (section.href) {
                return (
                  <Link
                    key={section.key}
                    href={section.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#56534C] hover:bg-[#FBF6EE] transition-colors whitespace-nowrap"
                  >
                    <Icon size={16} /> {section.label}
                  </Link>
                )
              }
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === section.key
                      ? 'bg-orange-50 text-[#FF6600] font-semibold'
                      : 'text-[#56534C] hover:bg-[#FBF6EE]'
                  }`}
                >
                  <Icon size={16} /> {section.label}
                </button>
              )
            })}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#56534C] hover:bg-[#FBF6EE] transition-colors whitespace-nowrap mt-2 md:border-t md:border-[#E4DDCF] md:pt-4"
            >
              Déconnexion
            </button>
          </nav>

          {/* Contenu */}
          <div>
            {activeSection === 'profile' && (
              <div className="bg-white rounded-2xl border border-[#E4DDCF] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Profil</h2>
                <p className="text-sm text-[#8A8579] mb-6">Vos informations personnelles.</p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <p className="text-xs font-semibold text-[#8A8579] uppercase mb-1">Nom</p>
                    <p className="text-[#1A1A1A]">{displayName !== 'Bienvenue' ? displayName : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#8A8579] uppercase mb-1">E-mail</p>
                    <p className="text-[#1A1A1A]">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'orders' && (
              <div>
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-6">Mes commandes</h2>

                {loadingOrders ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-white rounded-2xl border border-[#E4DDCF] p-6 animate-pulse">
                        <div className="h-4 bg-[#E4DDCF] rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-[#E4DDCF] rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-[#E4DDCF] p-12 text-center">
                    <ShoppingBag size={28} className="text-[#FF6600] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[#56534C] mb-4">Vous n&apos;avez pas encore passé de commande.</p>
                    <Link href="/products">
                      <Button variant="primary">Découvrir les produits</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => {
                      const status = statusLabels[order.status] || statusLabels.pending
                      const isExpanded = expandedOrder === order.id
                      const items = itemsByOrder[order.id] || []
                      const firstItem = items[0]

                      return (
                        <div key={order.id} className="bg-white rounded-2xl border border-[#E4DDCF] overflow-hidden">
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FBF6EE] transition-colors text-left gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1A1A1A]">{order.order_number}</p>
                              <p className="text-xs text-[#8A8579] mb-1">
                                {new Date(order.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {firstItem && (
                                <p className="text-sm text-[#56534C] truncate">
                                  {firstItem.product_name}{items.length > 1 ? ` +${items.length - 1} autre${items.length > 2 ? 's' : ''}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                {status.label}
                              </span>
                              <span className="font-semibold text-[#1A1A1A] whitespace-nowrap">
                                {order.total_fcfa.toLocaleString('fr-CI')} FCFA
                              </span>
                              <svg
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                className={`text-[#8A8579] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
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
            )}

            {activeSection === 'addresses' && (
              <div className="bg-white rounded-2xl border border-[#E4DDCF] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Adresses</h2>
                <p className="text-sm text-[#8A8579] mb-6">Utilisée pour pré-remplir vos livraisons.</p>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="bg-white rounded-2xl border border-[#E4DDCF] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Paramètres</h2>
                <p className="text-sm text-[#8A8579] mb-6">Gestion de votre compte.</p>
                <Button type="button" variant="outline" onClick={logout}>
                  Se déconnecter
                </Button>
              </div>
            )}

            {activeSection === 'help' && (
              <div className="bg-white rounded-2xl border border-[#E4DDCF] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Aide</h2>
                <p className="text-sm text-[#8A8579] mb-6">Besoin d&apos;assistance ?</p>
                <div className="flex flex-col gap-3 max-w-xs">
                  <Link href="/faq" className="text-[#FF6600] font-semibold hover:underline">Questions fréquentes →</Link>
                  <Link href="/contact" className="text-[#FF6600] font-semibold hover:underline">Nous contacter →</Link>
                  <Link href="/account/messages" className="text-[#FF6600] font-semibold hover:underline">Mes messages →</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
