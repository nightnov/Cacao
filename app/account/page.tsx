'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, ShoppingBag, MapPin, Heart, Settings, HelpCircle, Star, Clock, CheckCircle2, LayoutGrid, MessageCircle, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { formatAmount } from '@/lib/format'

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
  products: { slug: string; image_urls: string[] } | null
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
  pending: { label: 'En attente', color: 'bg-[#2A2D31] text-gray-700', dot: 'bg-gray-400' },
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

interface Review {
  id: string
  product_id: string
  rating: number
  comment: string | null
  created_at: string
  products: { name: string; slug: string } | null
}

interface FavoriteProduct {
  id: string
  name: string
  slug: string
  price_fcfa: number
  image_urls: string[]
  avg_rating?: number | null
  review_count?: number
}

const sections: AccountSection[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutGrid },
  { key: 'orders', label: 'Mes commandes', icon: ShoppingBag },
  { key: 'favorites', label: 'Mes favoris', icon: Heart },
  { key: 'reviews', label: 'Mes avis', icon: Star },
  { key: 'addresses', label: 'Mes adresses', icon: MapPin },
  { key: 'messages', label: 'Messages', icon: MessageCircle, href: '/account/messages' },
  { key: 'settings', label: 'Paramètres du compte', icon: Settings },
  { key: 'help', label: 'Aide', icon: HelpCircle }
]

export default function Account() {
  const router = useRouter()
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<string>('dashboard')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])

  const [profile, setProfile] = useState<Profile>({ phone: '', address: '', city: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({})
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(true)

  const [reviews, setReviews] = useState<Review[]>([])

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
            .select('id, order_id, product_name, quantity, unit_price_fcfa, subtotal_fcfa, products(slug, image_urls)')
            .in('order_id', orderIds)

          if (itemsError) throw itemsError

          const grouped: Record<string, OrderItem[]> = {}
          for (const item of (itemsData as unknown as OrderItem[]) || []) {
            if (!grouped[item.order_id]) grouped[item.order_id] = []
            grouped[item.order_id].push(item)
          }
          setItemsByOrder(grouped)
        }

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('id, product_id, rating, comment, created_at, products(name, slug)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setReviews((reviewsData as unknown as Review[]) || [])

        const { data: favoritesData } = await supabase
          .from('favorites')
          .select('product_id, products(id, name, slug, price_fcfa, image_urls)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        const favProducts = ((favoritesData as unknown as { products: FavoriteProduct | null }[]) || [])
          .map(row => row.products)
          .filter((p): p is FavoriteProduct => !!p)
        setFavorites(favProducts)

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender', 'admin')
          .eq('read_by_customer', false)
        setUnreadMessages(unreadCount || 0)
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
      <main className="min-h-screen bg-[#1C2021] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FDC700] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name
  const displayName = firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : 'Bienvenue'
  const avatarLetter = (firstName || user?.email || '?').charAt(0).toUpperCase()

  const pendingCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'shipped'].includes(o.status)).length
  const deliveredCount = orders.filter(o => o.status === 'delivered').length

  return (
    <main className="min-h-screen bg-[#171A1C] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto px-5 sm:px-10 py-6 sm:py-9 w-full">
        <nav aria-label="Fil d'Ariane" className="text-[13px] text-[#8E959D] mb-4">
          <Link href="/" className="hover:text-[#FDC700]">Accueil</Link>
          {' / '}
          <span className="text-[#EEF2F7]">Mon compte</span>
        </nav>

        {/* En-tête : identité du client et raccourci vers ses coordonnées */}
        <div className="bg-[#1C2021] border border-[#35383C] rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#2A2D31] text-white text-lg font-bold flex items-center justify-center flex-shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif font-extrabold text-lg sm:text-xl text-[#EEF2F7] truncate">
              Bonjour{displayName !== 'Bienvenue' ? `, ${displayName.split(' ')[0]}` : ''}
            </h1>
            <p className="text-[13px] text-[#8E959D] truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => setActiveSection('addresses')}
            className="hidden sm:block text-[13px] font-bold text-[#FDC700] hover:underline whitespace-nowrap"
          >
            Modifier mes infos
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 md:gap-6">
          {/* Navigation. Onglets défilants sur mobile, colonne sur grand écran :
              une colonne étroite compressée sur téléphone rendait les libellés
              illisibles. */}
          <nav className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto no-scrollbar md:overflow-visible md:bg-[#1C2021] md:border md:border-[#35383C] md:rounded-2xl md:p-2 md:h-fit">
            {sections.map(section => {
              const Icon = section.icon
              const base = 'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors whitespace-nowrap flex-shrink-0'

              if (section.href) {
                return (
                  <Link
                    key={section.key}
                    href={section.href}
                    className={`${base} bg-[#1C2021] border border-[#35383C] md:border-0 md:bg-transparent text-[#B3B8BE] hover:text-[#FDC700] md:hover:bg-[#171A1C]`}
                  >
                    <Icon size={16} strokeWidth={1.9} /> {section.label}
                    {section.key === 'messages' && unreadMessages > 0 && (
                      <span className="md:ml-auto bg-[#FDC700] text-[#1A1A1A] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadMessages}
                      </span>
                    )}
                  </Link>
                )
              }
              const active = activeSection === section.key
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`${base} ${
                    active
                      ? 'bg-[#2A2D31] text-white md:bg-[#2A2418] md:text-[#FDC700]'
                      : 'bg-[#1C2021] border border-[#35383C] md:border-0 md:bg-transparent text-[#B3B8BE] hover:text-[#FDC700] md:hover:bg-[#171A1C]'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.9} /> {section.label}
                </button>
              )
            })}
            <button
              onClick={logout}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-red-600 bg-[#1C2021] border border-[#35383C] md:border-0 md:bg-transparent hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0 md:mt-1 md:border-t md:border-[#35383C] md:rounded-none md:pt-3"
            >
              <LogOut size={16} strokeWidth={1.9} /> Déconnexion
            </button>
          </nav>

          {/* Contenu */}
          <div>
            {activeSection === 'dashboard' && (
              <div className="space-y-8">
                {/* Cartes statistiques */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Commandes', value: orders.length, icon: ShoppingBag, section: 'orders' },
                    { label: 'En attente', value: pendingCount, icon: Clock, section: 'orders' },
                    { label: 'Livrées', value: deliveredCount, icon: CheckCircle2, section: 'orders' },
                    { label: 'Favoris', value: favorites.length, icon: Heart, section: 'favorites' }
                  ].map(stat => (
                    <button
                      key={stat.label}
                      onClick={() => setActiveSection(stat.section)}
                      className="bg-[#1C2021] border border-[#35383C] rounded-2xl p-5 text-left hover:border-[#FDC700] transition-colors"
                    >
                      <stat.icon size={18} className="text-[#FDC700] mb-2" strokeWidth={1.5} />
                      <p className="text-2xl font-semibold text-[#EEF2F7]">{loadingOrders ? '—' : stat.value}</p>
                      <p className="text-xs text-[#8E959D]">{stat.label}</p>
                    </button>
                  ))}
                </div>

                {/* Commandes récentes */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif font-semibold text-xl text-[#EEF2F7]">Mes commandes récentes</h2>
                    {orders.length > 0 && (
                      <button onClick={() => setActiveSection('orders')} className="text-sm text-[#FDC700] font-semibold hover:underline">
                        Voir toutes mes commandes →
                      </button>
                    )}
                  </div>
                  {loadingOrders ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-4 h-16 animate-pulse" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C] p-10 text-center">
                      <ShoppingBag size={26} className="text-[#FDC700] mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-[#B3B8BE] mb-4">Vous n&apos;avez pas encore passé de commande.</p>
                      <Link href="/products"><Button variant="primary">Découvrir les produits</Button></Link>
                    </div>
                  ) : (
                    <div className="bg-[#1C2021] rounded-2xl border border-[#35383C] divide-y divide-[#35383C]">
                      {orders.slice(0, 4).map(order => {
                        const status = statusLabels[order.status] || statusLabels.pending
                        const items = itemsByOrder[order.id] || []
                        const firstItem = items[0]
                        const thumb = firstItem?.products?.image_urls?.[0]
                        return (
                          <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                            <div className="w-12 h-12 rounded-lg bg-[#171A1C] border border-[#35383C] overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag size={16} className="text-[#FDC700]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#EEF2F7] truncate">
                                {firstItem?.product_name || order.order_number}
                                {items.length > 1 ? ` +${items.length - 1}` : ''}
                              </p>
                              <p className="text-xs text-[#8E959D]">
                                {formatAmount(order.total_fcfa)} FCFA · x{firstItem?.quantity || 1}
                              </p>
                            </div>
                            <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                              {status.label}
                            </span>
                            <div className="text-right flex-shrink-0 hidden md:block">
                              <p className="text-xs text-[#8E959D]">Commande #{order.order_number}</p>
                              <p className="text-xs text-[#8E959D]">
                                {new Date(order.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <button onClick={() => setActiveSection('orders')} className="text-xs text-[#FDC700] font-semibold hover:underline flex-shrink-0">
                              Voir les détails →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-8">
                  {/* Favoris */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif font-semibold text-xl text-[#EEF2F7]">Mes produits favoris</h2>
                      {favorites.length > 0 && (
                        <button onClick={() => setActiveSection('favorites')} className="text-sm text-[#FDC700] font-semibold hover:underline">
                          Voir tous mes favoris →
                        </button>
                      )}
                    </div>
                    {favorites.length === 0 ? (
                      <div className="bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C] p-10 text-center">
                        <Heart size={26} className="text-[#FDC700] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-[#B3B8BE]">Aucun favori pour le moment.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {favorites.slice(0, 4).map(p => (
                          <Link key={p.id} href={`/products/${p.slug}`} className="group">
                            <div className="aspect-square rounded-xl bg-[#171A1C] border border-[#35383C] overflow-hidden mb-2">
                              {p.image_urls?.[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              )}
                            </div>
                            <p className="text-sm text-[#EEF2F7] truncate">{p.name}</p>
                            <p className="text-xs text-[#B3B8BE]">{formatAmount(p.price_fcfa)} FCFA</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Informations du compte */}
                  <div className="bg-[#1C2021] border border-[#35383C] rounded-2xl p-6 h-fit">
                    <h3 className="font-serif font-semibold text-lg text-[#EEF2F7] mb-4">Informations du compte</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[#8E959D] text-xs uppercase">Nom complet</p>
                        <p className="text-[#EEF2F7]">{displayName !== 'Bienvenue' ? displayName : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#8E959D] text-xs uppercase">E-mail</p>
                        <p className="text-[#EEF2F7] truncate">{user?.email}</p>
                      </div>
                      <div>
                        <p className="text-[#8E959D] text-xs uppercase">Téléphone</p>
                        <p className="text-[#EEF2F7]">{profile.phone || '—'}</p>
                      </div>
                    </div>
                    <Button variant="primary" className="w-full mt-5" onClick={() => setActiveSection('addresses')}>
                      Modifier mes informations
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'favorites' && (
              <div>
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-6">Mes favoris</h2>
                {favorites.length === 0 ? (
                  <div className="bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C] p-12 text-center">
                    <Heart size={28} className="text-[#FDC700] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[#B3B8BE] mb-4">Aucun favori pour le moment.</p>
                    <Link href="/products"><Button variant="primary">Découvrir les produits</Button></Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-8">
                    {favorites.map(p => (
                      <Link key={p.id} href={`/products/${p.slug}`} className="group">
                        <div className="aspect-square rounded-xl bg-[#171A1C] border border-[#35383C] overflow-hidden mb-2">
                          {p.image_urls?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )}
                        </div>
                        <p className="text-sm text-[#EEF2F7] truncate">{p.name}</p>
                        <p className="text-xs text-[#B3B8BE]">{formatAmount(p.price_fcfa)} FCFA</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'orders' && (
              <div>
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-6">Mes commandes</h2>

                {loadingOrders ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-6 animate-pulse">
                        <div className="h-4 bg-[#2A2D31] rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-[#2A2D31] rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C] p-12 text-center">
                    <ShoppingBag size={28} className="text-[#FDC700] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[#B3B8BE] mb-4">Vous n&apos;avez pas encore passé de commande.</p>
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
                        <div key={order.id} className="bg-[#1C2021] rounded-2xl border border-[#35383C] overflow-hidden">
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#171A1C] transition-colors text-left gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#EEF2F7]">{order.order_number}</p>
                              <p className="text-xs text-[#8E959D] mb-1">
                                {new Date(order.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {firstItem && (
                                <p className="text-sm text-[#B3B8BE] truncate">
                                  {firstItem.product_name}{items.length > 1 ? ` +${items.length - 1} autre${items.length > 2 ? 's' : ''}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                {status.label}
                              </span>
                              <span className="font-semibold text-[#EEF2F7] whitespace-nowrap">
                                {formatAmount(order.total_fcfa)} FCFA
                              </span>
                              <svg
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                className={`text-[#8E959D] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[#35383C] px-6 py-4 bg-[#171A1C]">
                              <div className="space-y-2 mb-4">
                                {items.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-[#B3B8BE]">{item.product_name} × {item.quantity}</span>
                                    <span className="text-[#EEF2F7] font-medium">
                                      {formatAmount(item.subtotal_fcfa)} FCFA
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {order.shipping_address && (
                                <p className="text-xs text-[#8E959D] mb-3">
                                  Livraison à {order.shipping_address.city}, {order.shipping_address.address}
                                </p>
                              )}

                              {order.delivery_code && !['delivered', 'cancelled', 'refunded'].includes(order.status) && (
                                <div className="bg-[#2A2418] border border-[#FDC700]/30 rounded-lg p-3 mb-3 text-center">
                                  <p className="text-[10px] font-semibold text-[#FDC700] uppercase mb-0.5">Code de livraison</p>
                                  <p className="text-xl font-bold text-[#EEF2F7] tracking-widest">{order.delivery_code}</p>
                                  <p className="text-[10px] text-[#B3B8BE] mt-1">
                                    À donner au livreur uniquement à la remise du colis
                                  </p>
                                </div>
                              )}

                              <div className="border-t border-[#35383C] pt-3 space-y-1">
                                <div className="flex justify-between text-xs text-[#B3B8BE]">
                                  <span>Produits</span>
                                  <span>{formatAmount(order.total_products_fcfa)} FCFA</span>
                                </div>
                                <div className="flex justify-between text-xs text-[#B3B8BE]">
                                  <span>Livraison</span>
                                  <span>{formatAmount(order.shipping_cost_fcfa)} FCFA</span>
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

            {activeSection === 'reviews' && (
              <div>
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-6">Mes avis</h2>

                {reviews.length === 0 ? (
                  <div className="bg-[#1C2021] rounded-2xl border-2 border-dashed border-[#35383C] p-12 text-center">
                    <Star size={28} className="text-[#FDC700] mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[#B3B8BE]">Vous n&apos;avez encore laissé aucun avis.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-6">
                        <div className="flex items-center justify-between mb-2 gap-4">
                          {review.products?.slug ? (
                            <Link href={`/products/${review.products.slug}`} className="font-semibold text-[#EEF2F7] hover:underline">
                              {review.products.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-[#EEF2F7]">{review.products?.name || 'Produit'}</span>
                          )}
                          <span className="text-xs text-[#8E959D] whitespace-nowrap">
                            {new Date(review.created_at).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={14} className={i <= review.rating ? 'fill-[#FDC700] text-[#FDC700]' : 'text-[#4E5257]'} />
                          ))}
                        </div>
                        {review.comment && <p className="text-sm text-[#B3B8BE]">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'addresses' && (
              <div className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-1">Adresses</h2>
                <p className="text-sm text-[#8E959D] mb-6">Utilisée pour pré-remplir vos livraisons.</p>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#EEF2F7] mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                        placeholder="07 00 00 00 00"
                        className="w-full px-4 py-2.5 border border-[#35383C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDC700]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#EEF2F7] mb-2">Ville</label>
                      <input
                        type="text"
                        value={profile.city || ''}
                        onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                        placeholder="Abidjan"
                        className="w-full px-4 py-2.5 border border-[#35383C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDC700]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#EEF2F7] mb-2">Adresse</label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                      placeholder="Quartier, rue, repère..."
                      className="w-full px-4 py-2.5 border border-[#35383C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDC700]"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <Button type="submit" variant="primary" disabled={savingProfile}>
                      {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    {profileSaved && <span className="text-sm text-[#3FCE7A] font-semibold">✓ Enregistré</span>}
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-1">Paramètres</h2>
                <p className="text-sm text-[#8E959D] mb-6">Gestion de votre compte.</p>
                <Button type="button" variant="outline" onClick={logout}>
                  Se déconnecter
                </Button>
              </div>
            )}

            {activeSection === 'help' && (
              <div className="bg-[#1C2021] rounded-2xl border border-[#35383C] p-8">
                <h2 className="font-serif font-semibold text-xl text-[#EEF2F7] mb-1">Aide</h2>
                <p className="text-sm text-[#8E959D] mb-6">Besoin d&apos;assistance ?</p>
                <div className="flex flex-col gap-3 max-w-xs">
                  <Link href="/faq" className="text-[#FDC700] font-semibold hover:underline">Questions fréquentes →</Link>
                  <Link href="/contact" className="text-[#FDC700] font-semibold hover:underline">Nous contacter →</Link>
                  <Link href="/account/messages" className="text-[#FDC700] font-semibold hover:underline">Mes messages →</Link>
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
