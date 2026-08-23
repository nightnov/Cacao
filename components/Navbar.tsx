'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Heart, ShoppingCart, User, LogOut, MessageSquare,
  Package, LayoutDashboard, Menu, X, Home
} from 'lucide-react'
import { getCartCount, CART_EVENT } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'
import { CategoryNav } from '@/components/CategoryNav'

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
  const { user, loading: authLoading, isLoggedIn, logout } = useAuth()
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const suggestions = popularSearches.length > 0 ? popularSearches : FALLBACK_SEARCH_SUGGESTIONS

  const handleSearchSubmit = (query?: string) => {
    const q = (query ?? searchQuery).trim()
    if (!q) return
    setShowSuggestions(false)
    setIsMenuOpen(false)
    router.push(`/products?search=${encodeURIComponent(q)}`)
  }


  // Raccourci Ctrl/Cmd + K vers la recherche, comme annoncé dans le champ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.from('popular_searches').select('query').limit(5)
        if (data && data.length > 0) setPopularSearches(data.map((d: { query: string }) => d.query))
      } catch {
        // silencieux : on garde les suggestions par défaut
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
        // silencieux : le badge n'est pas critique
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

  const act = 'relative flex flex-col items-center gap-1 text-[10.5px] font-medium text-[#B3B8BE] hover:text-[#FDC700] transition-colors'
  const badge = 'absolute -top-1.5 right-0 bg-[#FDC700] text-[#1A1A1A] text-[9px] font-extrabold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center'

  return (
    <nav className="bg-[#1C2021] border-b border-[#35383C] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-4 lg:gap-6">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden text-[#EEF2F7] flex-shrink-0"
          aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Le mot-symbole seul ramène toujours à l'accueil, depuis n'importe quelle page */}
        <Link href="/" className="font-display font-bold text-xl sm:text-2xl tracking-[2px] text-[#EEF2F7] hover:text-[#FDC700] transition-colors flex-shrink-0">
          CACAO
        </Link>

        <CategoryNav />


        {/* Recherche : occupe l'espace disponible entre la marque et les actions */}
        <div className="hidden sm:block relative flex-1 min-w-0 max-w-md ml-auto">
          <div className="flex items-center gap-2 bg-[#2A2D31] border border-[#3E4247] rounded-lg px-3 py-2 focus-within:border-[#FDC700] transition-colors">
            <Search size={16} className="text-[#8E959D] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
              className="text-[13px] bg-transparent outline-none text-[#EEF2F7] flex-1 min-w-0"
            />
            <kbd className="hidden md:block bg-[#35383C] rounded px-1.5 text-[10px] text-[#B3B8BE] flex-shrink-0">Ctrl K</kbd>
          </div>

          {showSuggestions && (
            <div className="absolute left-0 top-12 w-full min-w-[280px] bg-[#1C2021] rounded-xl border border-[#35383C] shadow-card-hover p-4 z-50">
              <p className="text-[11px] font-semibold text-[#8E959D] mb-3">Recherches fréquentes</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSearchSubmit(s)}
                    className="px-3 py-1.5 bg-[#2A2D31] border border-[#3E4247] hover:border-[#FDC700] hover:text-[#FDC700] rounded-lg text-[13px] text-[#B3B8BE] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5 sm:gap-6 ml-auto sm:ml-0 flex-shrink-0">
          <Link href="/account/favorites" className={`hidden sm:flex ${act}`}>
            <Heart size={19} strokeWidth={1.8} />
            <span>Favoris</span>
          </Link>

          {!authLoading && (
            isLoggedIn ? (
              <div className="relative" ref={accountMenuRef}>
                <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className={act} aria-expanded={isAccountMenuOpen}>
                  <span className="w-[19px] h-[19px] rounded-full bg-[#FDC700] text-[#1A1A1A] text-[10px] font-bold flex items-center justify-center">
                    {avatarLetter}
                  </span>
                  <span>Compte</span>
                  {unreadCount > 0 && <span className={badge}>{unreadCount}</span>}
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-[#1C2021] rounded-xl border border-[#35383C] shadow-card-hover overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#35383C] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FDC700] text-[#1A1A1A] font-bold flex items-center justify-center flex-shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#EEF2F7] truncate">{displayName}</p>
                        <Link href="/account" className="text-xs text-[#FDC700] hover:underline" onClick={() => setIsAccountMenuOpen(false)}>
                          Voir mon profil
                        </Link>
                      </div>
                    </div>

                    {isAdmin && (
                      <>
                        <Link href="/admin" onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#FDC700] hover:bg-[#2A2D31] transition-colors">
                          <LayoutDashboard size={16} strokeWidth={1.8} /> Tableau de bord admin
                        </Link>
                        <div className="border-t border-[#35383C]" />
                      </>
                    )}

                    <Link href="/" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#EEF2F7] hover:bg-[#2A2D31] transition-colors">
                      <Home size={16} strokeWidth={1.8} /> Retour à l&apos;accueil
                    </Link>
                    <Link href="/account" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#EEF2F7] hover:bg-[#2A2D31] transition-colors">
                      <Package size={16} strokeWidth={1.8} /> Mes commandes
                    </Link>
                    <Link href="/account/messages" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#EEF2F7] hover:bg-[#2A2D31] transition-colors">
                      <MessageSquare size={16} strokeWidth={1.8} /> Messages
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-[#FDC700] text-[#1A1A1A] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/account/favorites" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#EEF2F7] hover:bg-[#2A2D31] transition-colors">
                      <Heart size={16} strokeWidth={1.8} /> Mes favoris
                    </Link>

                    <div className="border-t border-[#35383C]" />
                    <button
                      onClick={() => { setIsAccountMenuOpen(false); logout() }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#F87171] hover:bg-[#2A2D31] transition-colors text-left"
                    >
                      <LogOut size={16} strokeWidth={1.8} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/account/login" className={act}>
                <User size={19} strokeWidth={1.8} />
                <span>Connexion</span>
              </Link>
            )
          )}

          <Link href="/cart" className={act}>
            <ShoppingCart size={19} strokeWidth={1.8} />
            <span>Panier</span>
            {cartCount > 0 && <span className={badge}>{cartCount}</span>}
          </Link>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[#35383C] bg-[#1C2021]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
            <div className="flex items-center gap-2 bg-[#2A2D31] border border-[#3E4247] rounded-lg px-3 py-2.5 mb-4">
              <Search size={16} className="text-[#8E959D] flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un produit…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                className="text-sm bg-transparent outline-none text-[#EEF2F7] flex-1 min-w-0"
              />
            </div>

            <Link href="/" className="flex items-center gap-3 py-2.5 text-sm font-semibold text-[#EEF2F7]" onClick={() => setIsMenuOpen(false)}>
              <Home size={17} strokeWidth={1.8} className="text-[#FDC700]" /> Accueil
            </Link>

            <p className="text-[11px] font-semibold text-[#8E959D] mt-3 mb-1">RAYONS</p>
            <Link href="/products" className="py-2 text-sm font-semibold text-[#EEF2F7]" onClick={() => setIsMenuOpen(false)}>
              Tous les produits
            </Link>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.value}
                  href={`/products?category=${cat.value}`}
                  className="flex items-center gap-3 py-2 text-sm text-[#B3B8BE] hover:text-[#FDC700] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon size={17} strokeWidth={1.8} className="text-[#FDC700]" />
                  {cat.label}
                </Link>
              )
            })}

            <div className="border-t border-[#35383C] my-3" />

            {!authLoading && (isLoggedIn ? (
              <>
                <Link href="/account" className="py-2 text-sm text-[#B3B8BE]" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>
                <Link href="/account/favorites" className="py-2 text-sm text-[#B3B8BE]" onClick={() => setIsMenuOpen(false)}>Mes favoris</Link>
                {isAdmin && (
                  <Link href="/admin" className="py-2 text-sm font-semibold text-[#FDC700]" onClick={() => setIsMenuOpen(false)}>
                    Tableau de bord admin
                  </Link>
                )}
                <button onClick={() => { setIsMenuOpen(false); logout() }} className="py-2 text-sm text-[#F87171] text-left">
                  Se déconnecter
                </button>
              </>
            ) : (
              <Link href="/account/login" className="py-2 text-sm font-semibold text-[#EEF2F7]" onClick={() => setIsMenuOpen(false)}>
                Connexion
              </Link>
            ))}

            <div className="border-t border-[#35383C] my-3" />
            {helpLinks.map(l => (
              <Link key={l.href} href={l.href} className="py-2 text-sm text-[#B3B8BE]" onClick={() => setIsMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
