'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Stats {
  products: number
  orders: number
  revenue: number
  cities: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    orders: 0,
    revenue: 0,
    cities: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        // Récupérer les stats
        const [productsRes, ordersRes, shippingRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('shipping_fees').select('id', { count: 'exact', head: true })
        ])

        setStats({
          products: productsRes.count || 0,
          orders: ordersRes.count || 0,
          revenue: 0, // À implémenter
          cities: shippingRes.count || 0
        })
      } catch (error) {
        console.error('Erreur lors du chargement des stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Produits',
      value: stats.products,
      icon: '🖥️',
      href: '/admin/products'
    },
    {
      label: 'Commandes',
      value: stats.orders,
      icon: '📦',
      href: '/admin/orders'
    },
    {
      label: 'Villes',
      value: stats.cities,
      icon: '🚚',
      href: '/admin/shipping'
    }
  ]

  return (
    <div>
      <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A] mb-2">Tableau de bord</h1>
      <p className="text-[#56534C] mb-12">Bienvenue dans l&apos;administration Cacao</p>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-6 animate-pulse">
              <div className="h-12 bg-[#E4DDCF] rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-[#E4DDCF] rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {statCards.map((card, idx) => (
            <a
              key={idx}
              href={card.href}
              className="bg-white rounded-lg border border-[#E4DDCF] p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="text-4xl mb-3">{card.icon}</div>
              <p className="text-[#8A8579] text-sm mb-2">{card.label}</p>
              <p className="font-serif font-bold text-3xl text-[#1A1A1A]">{card.value}</p>
            </a>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-[#E4DDCF] p-8">
        <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-6">Actions rapides</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/products?action=create"
            className="p-4 border-2 border-[#FF6600] rounded-lg hover:bg-[#FBF6EE] transition-colors text-center"
          >
            <div className="text-2xl mb-2">➕</div>
            <p className="font-semibold text-[#1A1A1A]">Ajouter un produit</p>
            <p className="text-sm text-[#56534C]">Créer un nouveau produit</p>
          </a>

          <a
            href="/admin/shipping"
            className="p-4 border-2 border-[#FF6600] rounded-lg hover:bg-[#FBF6EE] transition-colors text-center"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <p className="font-semibold text-[#1A1A1A]">Gérer livraison</p>
            <p className="text-sm text-[#56534C]">Configurer frais et villes</p>
          </a>

          <a
            href="/admin/orders"
            className="p-4 border-2 border-[#FF6600] rounded-lg hover:bg-[#FBF6EE] transition-colors text-center"
          >
            <div className="text-2xl mb-2">📋</div>
            <p className="font-semibold text-[#1A1A1A]">Voir commandes</p>
            <p className="text-sm text-[#56534C]">Gérer les commandes clients</p>
          </a>

          <a
            href="/admin/customers"
            className="p-4 border-2 border-[#FF6600] rounded-lg hover:bg-[#FBF6EE] transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <p className="font-semibold text-[#1A1A1A]">Clients</p>
            <p className="text-sm text-[#56534C]">Liste des utilisateurs</p>
          </a>
        </div>
      </div>
    </div>
  )
}
