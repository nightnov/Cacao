'use client'

import { useAdminAuth } from '@/hooks/useAdminAuth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Layers,
  LayoutGrid,
  ShoppingCart,
  MessageSquare,
  Truck,
  Users,
  Settings,
  BadgePercent,
  Palette,
  BookOpen,
  Menu,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { Avatar } from '@/components/admin/Avatar'

const adminLinks = [
  { label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
  { label: 'Produits', href: '/admin/products', icon: Package },
  { label: 'Stock', href: '/admin/stock', icon: Layers },
  { label: 'Rayons', href: '/admin/categories', icon: LayoutGrid },
  { label: 'Commandes', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'Frais livraison', href: '/admin/shipping', icon: Truck },
  { label: 'Clients', href: '/admin/customers', icon: Users },
  { label: 'Promotions', href: '/admin/promotions', icon: BadgePercent },
  { label: 'Apparence', href: '/admin/appearance', icon: Palette },
  { label: 'Réglages', href: '/admin/settings', icon: Settings },
  { label: 'Guide', href: '/admin/guide', icon: BookOpen }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user, logout } = useAdminAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    setMobileSidebarOpen(!mobileSidebarOpen)
  }

  const isLinkActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href))

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C2410C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5B4B41]">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 m-4 transform transition-transform duration-300 rounded-2xl
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:inset-y-auto md:translate-x-0 md:z-auto md:transition-all md:my-4 md:ml-4
        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
        bg-white border border-[#E8E0D8] flex flex-col flex-shrink-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-[#E8E0D8]">
          <Link href="/admin" className="font-serif font-bold text-2xl text-[#241A14] hover:opacity-80">
            {sidebarOpen || mobileSidebarOpen ? 'Cacao' : 'C'}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {adminLinks.map(link => {
            const active = isLinkActive(link.href)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                  active ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-[#5B4B41] hover:bg-gray-50'
                }`}
                title={link.label}
              >
                <Icon size={18} className="flex-shrink-0" />
                {(sidebarOpen || mobileSidebarOpen) && <span>{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[#E8E0D8] space-y-3">
          {(sidebarOpen || mobileSidebarOpen) && (
            <div className="flex items-center gap-3">
              <Avatar name={user?.email || '?'} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#241A14] truncate">{user?.email}</p>
                <p className="text-xs text-[#7D6A5D]">Administrateur</p>
              </div>
              <ChevronDown size={16} className="text-[#7D6A5D] ml-auto flex-shrink-0" />
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <LogOut size={16} />
            {(sidebarOpen || mobileSidebarOpen) && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-[#E8E0D8] px-6 py-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#241A14]"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[#5B4B41] hover:text-[#C2410C]">
              ← Voir le site
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
