'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCartCount, CART_EVENT } from '@/lib/cart'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'

const FALLBACK_SEARCH_SUGGESTIONS = ['Portables', 'Ordinateurs de bureau', 'Accessoires']

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

const navLinks = [
  { label: 'Catalogue', href: '/products' },
  { label: 'À propos', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' }
]

const categoryLinks = [
  { label: 'Portables', href: '/products?category=portable' },
  { label: 'Ordinateurs de bureau', href: '/products?category=bureau' },
  { label: 'Accessoires', href: '/products?category=accessoire' }
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

  const suggestions = popularSearches.length > 0 ? popularSearches : FALLBACK_SEARCH_SUGGESTIONS

  const handleSearchSubmit = (query?: string) => {
    const q = (query ?? searchQuery).trim()
    if (!q) return
    setShowSuggestions(false)
    setIsMenuOpen(false)
    router.push(`/products?search=${encodeURIComponent(q)}`)
  }

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

  return (
    <nav className="bg-white border-b border-[#E4DDCF]">
      <div className="max-w-7xl mx-auto px-10 py-4 flex items-center justify-between">
        {/* Logo + Mobile Menu Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex flex-col gap-1.5"
            aria-label="Ouvrir le menu"
          >
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
          <Link href="/" className="font-serif font-bold text-3xl text-[#1A1A1A] hover:opacity-80">
            Cacao
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6600] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Search + Cart */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:block relative">
            <div className="flex bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-2 items-center gap-2">
              <input
                type="text"
                placeholder="Chercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearchSubmit()
                }}
                className="text-sm bg-transparent outline-none text-[#1A1A1A] placeholder-[#8A8579] w-56 md:w-80"
              />
              <button
                onClick={() => handleSearchSubmit()}
                className="bg-[#FF6600] w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-[#E65C00] flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            {showSuggestions && (
              <div className="absolute left-0 top-12 w-80 bg-white rounded-lg border border-[#E4DDCF] shadow-lg p-4 z-50">
                <p className="text-xs font-semibold text-[#8A8579] uppercase mb-3">Recherches populaires</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSearchSubmit(s)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-[#FF6600] rounded-full text-sm text-[#56534C] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Account */}
          {!authLoading && (
            isLoggedIn ? (
              <div className="hidden sm:block relative" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white font-semibold flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  {avatarLetter}
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-lg border border-[#E4DDCF] shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#E4DDCF] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white font-semibold flex items-center justify-center flex-shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{displayName}</p>
                        <Link
                          href="/account"
                          className="text-xs text-[#FF6600] hover:underline"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          Voir mon profil
                        </Link>
                      </div>
                    </div>

                    {isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#FF6600] hover:bg-[#FBF6EE] transition-colors"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="7" height="9" />
                            <rect x="14" y="3" width="7" height="5" />
                            <rect x="14" y="12" width="7" height="9" />
                            <rect x="3" y="16" width="7" height="5" />
                          </svg>
                          Dashboard Admin
                        </Link>
                        <div className="border-t border-[#E4DDCF]"></div>
                      </>
                    )}

                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#FBF6EE] transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                        <path d="M14 2v5h5" />
                      </svg>
                      Mes commandes
                    </Link>

                    <Link
                      href="/account/messages"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#FBF6EE] transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Messages
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-[#FF6600] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/cart"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#FBF6EE] transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      Mon panier
                    </Link>

                    <div className="border-t border-[#E4DDCF]"></div>

                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#FBF6EE] transition-colors text-left"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/account/login"
                className="hidden sm:block text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6600] transition-colors"
              >
                Connexion
              </Link>
            )
          )}

          {/* Cart Icon */}
          <Link href="/cart" className="relative hover:opacity-70 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#FF6600] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[#E4DDCF] bg-white">
          <div className="max-w-7xl mx-auto px-10 py-4 flex flex-col gap-2">
            {/* Main navigation */}
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6600] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-[#E4DDCF] my-2"></div>

            {/* Account */}
            {!authLoading && (
              isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                      {avatarLetter}
                    </div>
                    <span className="text-sm font-semibold text-[#1A1A1A] truncate">{displayName}</span>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-sm font-semibold text-[#FF6600] hover:underline py-1.5 pl-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard Admin
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors py-1.5 pl-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mes commandes
                  </Link>
                  <Link
                    href="/account/messages"
                    className="flex items-center gap-2 text-sm text-[#56534C] hover:text-[#FF6600] transition-colors py-1.5 pl-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Messages
                    {unreadCount > 0 && (
                      <span className="bg-[#FF6600] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => { setIsMenuOpen(false); logout() }}
                    className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors py-1.5 pl-4 text-left"
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link
                  href="/account/login"
                  className="text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6600] transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion
                </Link>
              )
            )}

            {/* Divider */}
            <div className="border-t border-[#E4DDCF] my-2"></div>

            {/* Category filters */}
            <div className="text-xs font-semibold text-[#8A8579] py-2 uppercase">Catégories</div>
            {categoryLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors py-1.5 pl-4"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Search */}
            <div className="flex bg-white border-2 border-[#1A1A1A] rounded-lg px-3 py-2 items-center gap-2 mt-4">
              <input
                type="text"
                placeholder="Chercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearchSubmit()
                }}
                className="text-sm bg-transparent outline-none text-[#1A1A1A] placeholder-[#8A8579] flex-1"
              />
              <button
                onClick={() => handleSearchSubmit()}
                className="bg-[#FF6600] w-8 h-8 rounded flex items-center justify-center text-white hover:bg-[#E65C00] flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            {/* Mobile popular searches */}
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSearchSubmit(s)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-[#FF6600] rounded-full text-xs text-[#56534C] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
