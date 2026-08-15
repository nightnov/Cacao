'use client'

import { useAdminAuth } from '@/hooks/useAdminAuth'
import Link from 'next/link'
import { useState } from 'react'

const adminLinks = [
  { label: 'Tableau de bord', href: '/admin', icon: '📊' },
  { label: 'Produits', href: '/admin/products', icon: '🖥️' },
  { label: 'Commandes', href: '/admin/orders', icon: '📦' },
  { label: 'Messages', href: '/admin/messages', icon: '💬' },
  { label: 'Frais livraison', href: '/admin/shipping', icon: '🚚' },
  { label: 'Clients', href: '/admin/customers', icon: '👥' }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user, logout } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    setMobileSidebarOpen(!mobileSidebarOpen)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF6EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E85D25] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#56534C]">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-[#FBF6EE] overflow-hidden">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:z-auto md:transition-all
        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
        bg-[#1A1A1A] text-white flex flex-col flex-shrink-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-[#333]">
          <Link href="/admin" className="font-serif font-bold text-2xl hover:opacity-80">
            {sidebarOpen || mobileSidebarOpen ? 'Cacao' : 'C'}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {adminLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#333] transition-colors text-sm font-medium"
              title={link.label}
            >
              <span className="text-lg">{link.icon}</span>
              {(sidebarOpen || mobileSidebarOpen) && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[#333] space-y-3">
          {(sidebarOpen || mobileSidebarOpen) && (
            <div className="text-xs">
              <p className="text-[#8A8579]">Connecté en tant que</p>
              <p className="font-semibold truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-[#E85D25] hover:bg-[#d04a1a] rounded-lg font-semibold text-sm transition-colors"
          >
            {sidebarOpen || mobileSidebarOpen ? 'Déconnexion' : '⎋'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-[#E4DDCF] px-6 py-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-[#FBF6EE] rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[#56534C] hover:text-[#E85D25]">
              ← Voir le site
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
