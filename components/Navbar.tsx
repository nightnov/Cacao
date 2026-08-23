'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  LogOut,
  MessageSquare,
  Package,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react'
import { getCartCount, CART_EVENT } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'
import { TrustBar } from '@/components/TrustBar'

const FALLBACK_SEARCH_SUGGESTIONS = ['PC portable', 'Écran', 'Clavier']

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

const helpLinks = [
  { label: 'À propos', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' }
]

export function Navbar() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const suggestions = popularSearches.length > 0 ? popularSearches : FALLBACK_SEARCH_SUGGESTIONS

  const handleSearchSubmit = (query?: string) => {
    const q = (query ?? searchQuery).trim()
    if (!q) return
    setShowSuggestions(false)
    setIsMenuOpen(false)
    router.push(`/products?search=${encodeURIComponent(q)}`)
  }

  // Catégorie active lue depuis l'URL côté client. On évite `useSearchParams`
  // ici : ce hook rendrait dynamiques toutes les pages statiques qui affichent
  // la navbar, ou imposerait un Suspense autour d'elle.
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.search)
      setActiveCategory(window.location.pathname === '/products' ? p.get('category') : null)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.from('popular_searches').select('query').limit(5)
        if (data && data.length > 0) {
          setPopularSearches(data.map((d: { query: string }) => d.query))
        }
      } catch {
        // silencieux: on garde les suggestions par défaut
      }
    }
    fetchPopularSearches()
  }, [])

  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount())
    updateCount()
    window.addEventListener(CART_EVENT, updateCount)
    window.addEventListener('storage', updateCount)
    return () => {
      window.removeEventListener(CART_EVENT, updateCount)
      window.removeEventListener('storage', updateCount)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn || !user) return
    const fetchUnread = async () => {
      try {
        const supabase = getSupabaseClient()
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('sender', 'admin')
          .eq('read_by_customer', false)
        setUnreadCount(count || 0)
      } catch {
        // silencieux: le badge n'est pas critique
      }
    }
    fetchUnread()
  }, [isLoggedIn, user])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name
  const displayName = firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : user?.email
  const avatarLetter = (firstName || user?.email || '?').charAt(0).toUpperCase()
  const isAdmin = user?.id === ADMIN_UUID

  const actionItem = 'flex flex-col items-center gap-0.5 text-[10px] font-medium text-[#5B4B41] hover:text-[#C2410C] transition-colors'

  return (
    <>
      {/* Bandeau utilitaire : les moyens de paiement acceptés sont la première
          question d'un acheteur qui n'a jamais commandé en ligne. */}
      <div className="bg-[#241A14] text-[#E9DCD2]">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-1.5 flex items-center justify-between gap-4 text-[11px]">
          <span className="truncate">Livraison suivie à Abidjan et en région</span>
          <span className="hidden sm:block truncate">
            Paiement <strong className="text-[#F0A578] font-semibold">Wave · Orange Money · MTN · Moov · Carte</strong>
          </span>
        </div>
      </div>

      <nav className="bg-white border-b border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-3 flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-[#241A14] flex-shrink-0"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Marque : pastille orange + mot-symbole, reprise de la maquette validée */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-80 transition-opacity" aria-label="CACAO, accueil">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#C2410C] flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <span className="w-3.5 h-2.5 sm:w-4 sm:h-3 border-2 border-white rounded-[2px]" />
            </span>
            <span className="font-serif font-extrabold text-2xl sm:text-3xl text-[#241A14] tracking-tight">Cacao</span>
          </Link>

          {/* Recherche : occupe tout l'espace entre le logo et les actions */}
          <div className="hidden sm:block relative flex-1 min-w-0">
            <div className="flex bg-white border-2 border-[#241A14] rounded-full pl-4 pr-1 py-1 items-center gap-2">
              <input
                type="text"
                placeholder="Rechercher un PC portable, un écran, un accessoire…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                className="text-sm bg-transparent outline-none text-[#241A14] placeholder-[#7D6A5D] flex-1 min-w-0 py-1.5"
              />
              <button
                onClick={() => handleSearchSubmit()}
                aria-label="Lancer la recherche"
                className="bg-[#C2410C] w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-[#9A3412] flex-shrink-0 transition-colors"
              >
                <Search size={16} strokeWidth={2.4} />
              </button>
            </div>

            {showSuggestions && (
              <div className="absolute left-0 top-14 w-80 bg-white rounded-xl border border-[#E8E0D8] shadow-card-hover p-4 z-50">
                <p className="text-xs font-semibold text-[#7D6A5D] mb-3">Recherches fréquentes</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSearchSubmit(s)}
                      className="px-3 py-1.5 bg-[#FAF7F4] hover:bg-orange-50 hover:text-[#C2410C] rounded-full text-sm text-[#5B4B41] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions avec libellés : une icône seule laisse le client deviner */}
          <div className="flex items-center gap-4 sm:gap-5 ml-auto flex-shrink-0">
            <Link href="/account/favorites" className={`hidden sm:flex ${actionItem}`}>
              <Heart size={19} strokeWidth={1.7} />
              Favoris
            </Link>

            {!authLoading && isLoggedIn && (
              <Link href="/account" className={`hidden md:flex ${actionItem} relative`}>
                <Package size={19} strokeWidth={1.7} />
                Commandes
                {unreadCount > 0 && (
                  <span className="absolute -top-1 right-1 bg-[#C2410C] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            <Link href="/cart" className={`${actionItem} relative`}>
              <ShoppingCart size={19} strokeWidth={1.7} />
              Panier
              {cartCount > 0 && (
                <span className="absolute -top-1 right-0 bg-[#C2410C] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {!authLoading && (
              isLoggedIn ? (
                <div className="relative" ref={accountMenuRef}>
                  <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className={actionItem}>
                    <span className="w-[19px] h-[19px] rounded-full bg-[#241A14] text-white text-[10px] font-bold flex items-center justify-center">
                      {avatarLetter}
                    </span>
                    Compte
                  </button>

                  {isAccountMenuOpen && (
                    <div className="absolute right-0 top-14 w-64 bg-white rounded-xl border border-[#E8E0D8] shadow-card-hover overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-[#E8E0D8] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#241A14] text-white font-semibold flex items-center justify-center flex-shrink-0">
                          {avatarLetter}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#241A14] truncate">{displayName}</p>
                          <Link href="/account" className="text-xs text-[#C2410C] hover:underline" onClick={() => setIsAccountMenuOpen(false)}>
                            Voir mon profil
                          </Link>
                        </div>
                      </div>

                      {isAdmin && (
                        <>
                          <Link href="/admin" onClick={() => setIsAccountMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#C2410C] hover:bg-[#FAF7F4] transition-colors">
                            <LayoutDashboard size={16} strokeWidth={1.8} /> Tableau de bord admin
                          </Link>
                          <div className="border-t border-[#E8E0D8]" />
                        </>
                      )}

                      <Link href="/account" onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[#241A14] hover:bg-[#FAF7F4] transition-colors">
                        <Package size={16} strokeWidth={1.8} /> Mes commandes
                      </Link>
                      <Link href="/account/messages" onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[#241A14] hover:bg-[#FAF7F4] transition-colors">
                        <MessageSquare size={16} strokeWidth={1.8} /> Messages
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-[#C2410C] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/account/favorites" onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[#241A14] hover:bg-[#FAF7F4] transition-colors">
                        <Heart size={16} strokeWidth={1.8} /> Mes favoris
                      </Link>

                      <div className="border-t border-[#E8E0D8]" />
                      <button
                        onClick={() => { setIsAccountMenuOpen(false); logout() }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#241A14] hover:bg-[#FAF7F4] transition-colors text-left"
                      >
                        <LogOut size={16} strokeWidth={1.8} /> Se déconnecter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/account/login" className={actionItem}>
                  <User size={19} strokeWidth={1.7} />
                  Connexion
                </Link>
              )
            )}
          </div>
        </div>

        {/* Barre de catégories : accès direct aux rayons réels, sans détour par un menu */}
        <div className="hidden lg:block border-t border-[#F0E9E2]">
          <div className="max-w-7xl mx-auto px-5 sm:px-10 flex items-center gap-1 overflow-x-auto no-scrollbar">
            <Link
              href="/products"
              className={`px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                !activeCategory ? 'text-[#C2410C] border-[#C2410C] font-bold' : 'text-[#5B4B41] border-transparent hover:text-[#241A14]'
              }`}
            >
              Tous les produits
            </Link>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.value}
                href={`/products?category=${cat.value}`}
                className={`px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeCategory === cat.value
                    ? 'text-[#C2410C] border-[#C2410C] font-bold'
                    : 'text-[#5B4B41] border-transparent hover:text-[#241A14]'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-[#E8E0D8] bg-white">
            <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col">
              <div className="flex bg-white border-2 border-[#241A14] rounded-full pl-4 pr-1 py-1 items-center gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un produit…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                  className="text-sm bg-transparent outline-none text-[#241A14] placeholder-[#7D6A5D] flex-1 min-w-0 py-1.5"
                />
                <button
                  onClick={() => handleSearchSubmit()}
                  aria-label="Lancer la recherche"
                  className="bg-[#C2410C] w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                >
                  <Search size={16} strokeWidth={2.4} />
                </button>
              </div>

              <p className="text-[11px] font-semibold text-[#7D6A5D] mb-1">RAYONS</p>
              <Link href="/products" className="py-2 text-sm font-semibold text-[#241A14]" onClick={() => setIsMenuOpen(false)}>
                Tous les produits
              </Link>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <Link
                    key={cat.value}
                    href={`/products?category=${cat.value}`}
                    className="flex items-center gap-3 py-2 text-sm text-[#5B4B41] hover:text-[#C2410C] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon size={17} strokeWidth={1.7} className="text-[#C2410C]" />
                    {cat.label}
                  </Link>
                )
              })}

              <div className="border-t border-[#E8E0D8] my-3" />

              {!authLoading && (isLoggedIn ? (
                <>
                  <Link href="/account" className="py-2 text-sm text-[#5B4B41]" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>
                  <Link href="/account/favorites" className="py-2 text-sm text-[#5B4B41]" onClick={() => setIsMenuOpen(false)}>Mes favoris</Link>
                  {isAdmin && (
                    <Link href="/admin" className="py-2 text-sm font-semibold text-[#C2410C]" onClick={() => setIsMenuOpen(false)}>
                      Tableau de bord admin
                    </Link>
                  )}
                  <button onClick={() => { setIsMenuOpen(false); logout() }} className="py-2 text-sm text-[#5B4B41] text-left">
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link href="/account/login" className="py-2 text-sm font-semibold text-[#241A14]" onClick={() => setIsMenuOpen(false)}>
                  Connexion
                </Link>
              ))}

              <div className="border-t border-[#E8E0D8] my-3" />
              {helpLinks.map(l => (
                <Link key={l.href} href={l.href} className="py-2 text-sm text-[#5B4B41]" onClick={() => setIsMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <TrustBar />
    </>
  )
}
