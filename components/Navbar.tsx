'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCartCount, CART_EVENT } from '@/lib/cart'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

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

  return (
    <nav className="bg-[#FBF6EE] border-b border-[#E4DDCF]">
      <div className="max-w-7xl mx-auto px-10 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif font-bold text-3xl text-[#1A1A1A] hover:opacity-80 flex-shrink-0">
          Cacao
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[#1A1A1A] hover:text-[#E85D25] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Search + Cart */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:flex bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-2 items-center gap-2">
            <input
              type="text"
              placeholder="Chercher..."
              className="text-sm bg-transparent outline-none text-[#1A1A1A] placeholder-[#8A8579] w-32"
            />
            <button className="bg-[#E85D25] w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-[#d04a1a]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          {/* Cart Icon */}
          <Link href="/cart" className="relative hover:opacity-70 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#E85D25] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex flex-col gap-1.5"
          >
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-[#1A1A1A] transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
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
                className="text-sm font-semibold text-[#1A1A1A] hover:text-[#E85D25] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-[#E4DDCF] my-2"></div>

            {/* Category filters */}
            <div className="text-xs font-semibold text-[#8A8579] py-2 uppercase">Catégories</div>
            {categoryLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#56534C] hover:text-[#E85D25] transition-colors py-1.5 pl-4"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Search */}
            <div className="flex bg-[#FBF6EE] border-2 border-[#1A1A1A] rounded-lg px-3 py-2 items-center gap-2 mt-4">
              <input
                type="text"
                placeholder="Chercher..."
                className="text-sm bg-transparent outline-none text-[#1A1A1A] placeholder-[#8A8579] flex-1"
              />
              <button className="bg-[#E85D25] w-8 h-8 rounded flex items-center justify-center text-white hover:bg-[#d04a1a]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
