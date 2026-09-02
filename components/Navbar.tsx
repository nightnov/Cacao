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
import { useCategories } from '@/hooks/useCategories'
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
  const categories = useCategories()
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

  const act = 'relative flex flex-col items-center gap-1 text-[10.5px] font-medium text-ink-dim hover:text-ink transition-colors'
  const badge = 'absolute -top-1.5 right-0 bg-accent text-ink-invert text-[9px] font-extrabold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center'

  return (
    /* En-tête figé. Le fond reste très peu transparent : sous une barre trop
       translucide, le contenu qui défile derrière rend les libellés illisibles.
       Le flou fait l'essentiel du travail, l'opacité reste haute.
       `supports-[backdrop-filter]` : sans flou disponible, on retombe sur un
       fond plein plutôt que sur une barre à moitié transparente. */
    <nav className="sticky top-0 z-40 border-b border-border bg-bg-panel shadow-header supports-[backdrop-filter]:bg-bg-panel/85 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 lg:gap-6">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden text-ink flex-shrink-0"
          aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Le mot-symbole seul ramène toujours à l'accueil, depuis n'importe quelle page */}
        <Link href="/" className="font-display font-bold text-xl sm:text-2xl tracking-[2px] text-ink hover:text-ink-dim transition-colors flex-shrink-0">
          CACAO
        </Link>

        <CategoryNav />


        {/* Recherche : occupe l'espace disponible entre la marque et les actions */}
        <div className="hidden sm:block relative flex-1 min-w-0 max-w-md ml-auto">
          <div className="flex items-center gap-2 bg-bg-raised border border-border-mid rounded-lg px-3 py-2 focus-within:border-border-strong transition-colors">
            <Search size={16} className="text-ink-dimmer flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
              className="text-[13px] bg-transparent outline-none text-ink flex-1 min-w-0"
            />
            <kbd className="hidden md:block bg-border rounded px-1.5 text-[10px] text-ink-dim flex-shrink-0">Ctrl K</kbd>
          </div>

          {showSuggestions && (
            <div className="absolute left-0 top-12 w-full min-w-[280px] bg-bg-panel rounded-xl border border-border shadow-card-hover p-4 z-50">
              <p className="text-[11px] font-semibold text-ink-dimmer mb-3">Recherches fréquentes</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSearchSubmit(s)}
                    className="px-3 py-1.5 bg-bg-raised border border-border-mid hover:border-border-strong hover:text-ink rounded-lg text-[13px] text-ink-dim transition-colors"
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
                  <span className="w-[19px] h-[19px] rounded-full bg-accent text-ink-invert text-[10px] font-bold flex items-center justify-center">
                    {avatarLetter}
                  </span>
                  <span>Compte</span>
                  {unreadCount > 0 && <span className={badge}>{unreadCount}</span>}
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-bg-panel rounded-xl border border-border shadow-card-hover overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-raised border border-border-strong text-ink font-bold flex items-center justify-center flex-shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
                        <Link href="/account" className="text-xs text-ink-dim hover:text-ink hover:underline" onClick={() => setIsAccountMenuOpen(false)}>
                          Voir mon profil
                        </Link>
                      </div>
                    </div>

                    {isAdmin && (
                      <>
                        <Link href="/admin" onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-ink hover:bg-bg-raised transition-colors">
                          <LayoutDashboard size={16} strokeWidth={1.8} /> Tableau de bord admin
                        </Link>
                        <div className="border-t border-border" />
                      </>
                    )}

                    <Link href="/" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-bg-raised transition-colors">
                      <Home size={16} strokeWidth={1.8} /> Retour à l&apos;accueil
                    </Link>
                    <Link href="/account" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-bg-raised transition-colors">
                      <Package size={16} strokeWidth={1.8} /> Mes commandes
                    </Link>
                    <Link href="/account/messages" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-bg-raised transition-colors">
                      <MessageSquare size={16} strokeWidth={1.8} /> Messages
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-accent text-ink-invert text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/account/favorites" onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-bg-raised transition-colors">
                      <Heart size={16} strokeWidth={1.8} /> Mes favoris
                    </Link>

                    <div className="border-t border-border" />
                    <button
                      onClick={() => { setIsAccountMenuOpen(false); logout() }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-danger hover:bg-bg-raised transition-colors text-left"
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
        <div className="lg:hidden border-t border-border bg-bg-panel">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
            <div className="flex items-center gap-2 bg-bg-raised border border-border-mid rounded-lg px-3 py-2.5 mb-4">
              <Search size={16} className="text-ink-dimmer flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un produit…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                className="text-sm bg-transparent outline-none text-ink flex-1 min-w-0"
              />
            </div>

            <Link href="/" className="flex items-center gap-3 py-2.5 text-sm font-semibold text-ink" onClick={() => setIsMenuOpen(false)}>
              <Home size={17} strokeWidth={1.8} className="text-ink-dimmer" /> Accueil
            </Link>

            <p className="text-[11px] font-semibold text-ink-dimmer mt-3 mb-1">RAYONS</p>
            <Link href="/products" className="py-2 text-sm font-semibold text-ink" onClick={() => setIsMenuOpen(false)}>
              Tous les produits
            </Link>
            {categories.map(cat => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.value}
                  href={`/products?category=${cat.value}`}
                  className="flex items-center gap-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon size={17} strokeWidth={1.8} className="text-ink-dimmer" />
                  {cat.label}
                </Link>
              )
            })}

            <div className="border-t border-border my-3" />

            {!authLoading && (isLoggedIn ? (
              <>
                <Link href="/account" className="py-2 text-sm text-ink-dim" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>
                <Link href="/account/favorites" className="py-2 text-sm text-ink-dim" onClick={() => setIsMenuOpen(false)}>Mes favoris</Link>
                {isAdmin && (
                  <Link href="/admin" className="py-2 text-sm font-semibold text-ink" onClick={() => setIsMenuOpen(false)}>
                    Tableau de bord admin
                  </Link>
                )}
                <button onClick={() => { setIsMenuOpen(false); logout() }} className="py-2 text-sm text-danger text-left">
                  Se déconnecter
                </button>
              </>
            ) : (
              <Link href="/account/login" className="py-2 text-sm font-semibold text-ink" onClick={() => setIsMenuOpen(false)}>
                Connexion
              </Link>
            ))}

            <div className="border-t border-border my-3" />
            {helpLinks.map(l => (
              <Link key={l.href} href={l.href} className="py-2 text-sm text-ink-dim" onClick={() => setIsMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
