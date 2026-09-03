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
  FileText,
  Star,
  Hourglass,
  History,
  Palette,
  BookOpen,
  Menu,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { Avatar } from '@/components/admin/Avatar'

/**
 * Navigation groupée. À seize entrées, une liste à plat devenait impossible à
 * parcourir : les intitulés se ressemblent (« Produits », « Stock »,
 * « Rayons ») et rien n'indiquait ce qui relevait de la vente ou du site.
 */
const adminGroups: {
  title: string | null
  links: { label: string; href: string; icon: typeof LayoutDashboard }[]
}[] = [
  {
    title: null,
    links: [{ label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard }],
  },
  {
    title: 'VENTES',
    links: [
      { label: 'Commandes', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Non réglées', href: '/admin/abandoned', icon: Hourglass },
      { label: 'Clients', href: '/admin/customers', icon: Users },
      { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
      { label: 'Avis', href: '/admin/reviews', icon: Star },
    ],
  },
  {
    title: 'CATALOGUE',
    links: [
      { label: 'Produits', href: '/admin/products', icon: Package },
      { label: 'Stock', href: '/admin/stock', icon: Layers },
      { label: 'Rayons', href: '/admin/categories', icon: LayoutGrid },
      { label: 'Glossaire', href: '/admin/glossary', icon: BookOpen },
    ],
  },
  {
    title: 'SITE',
    links: [
      { label: 'Promotions', href: '/admin/promotions', icon: BadgePercent },
      { label: 'Contenu', href: '/admin/content', icon: FileText },
      { label: 'Apparence', href: '/admin/appearance', icon: Palette },
      { label: 'Frais livraison', href: '/admin/shipping', icon: Truck },
    ],
  },
  {
    title: 'SYSTÈME',
    links: [
      { label: 'Journal', href: '/admin/activity', icon: History },
      { label: 'Réglages', href: '/admin/settings', icon: Settings },
      { label: 'Guide', href: '/admin/guide', icon: BookOpen },
    ],
  },
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-dim">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
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
        bg-bg-panel border border-border flex flex-col flex-shrink-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="font-serif font-bold text-2xl text-ink hover:opacity-80">
            {sidebarOpen || mobileSidebarOpen ? 'Cacao' : 'C'}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {adminGroups.map((group, gi) => (
            <div key={group.title || `g${gi}`} className="mb-1">
              {/* Le titre de groupe disparaît en barre réduite : il n'y aurait
                  pas la place, et les icônes suffisent à s'y retrouver.

                  `ink-dimmer` et non `ink-faint` : ce dernier tombe à 3,6:1 sur
                  le fond des panneaux, sous le minimum lisible. */}
              {group.title && (sidebarOpen || mobileSidebarOpen) && (
                <p className="text-[10px] font-bold tracking-wider text-ink-dimmer px-4 pt-3 pb-1.5">
                  {group.title}
                </p>
              )}
              {group.title && !sidebarOpen && !mobileSidebarOpen && (
                <div className="border-t border-border my-2 mx-3" />
              )}
              {group.links.map(link => {
                const active = isLinkActive(link.href)
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                      active
                        ? 'bg-gold/10 text-gold font-semibold'
                        : 'text-ink-dim hover:bg-bg-raised'
                    }`}
                    title={link.label}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {(sidebarOpen || mobileSidebarOpen) && <span>{link.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border space-y-3">
          {(sidebarOpen || mobileSidebarOpen) && (
            <div className="flex items-center gap-3">
              <Avatar name={user?.email || '?'} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{user?.email}</p>
                <p className="text-xs text-ink-dimmer">Administrateur</p>
              </div>
              <ChevronDown size={16} className="text-ink-dimmer ml-auto flex-shrink-0" />
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dim text-ink-invert rounded-xl font-semibold text-sm transition-colors"
          >
            <LogOut size={16} />
            {(sidebarOpen || mobileSidebarOpen) && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-bg-raised rounded-lg transition-colors text-ink"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-ink-dim hover:text-gold">
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
