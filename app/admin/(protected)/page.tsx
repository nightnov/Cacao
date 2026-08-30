'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Users, ShoppingCart, Wallet, Package, Plus, Settings, ClipboardList, SearchX, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/admin/StatCard'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { TableShell, Column } from '@/components/admin/TableShell'
import { StatusBadge, StatusTone } from '@/components/admin/StatusBadge'
import { Avatar } from '@/components/admin/Avatar'
import { Order } from '@/types/admin'
import { formatAmount } from '@/lib/format'

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const orderStatusLabels: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'En attente', tone: 'neutral' },
  confirmed: { label: 'Confirmée', tone: 'info' },
  preparing: { label: 'Préparation', tone: 'pending' },
  shipped: { label: 'Expédiée', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'danger' },
  refunded: { label: 'Remboursée', tone: 'danger' }
}

interface Trend {
  value: number
  direction: 'up' | 'down'
}

interface Stats {
  products: number
  orders: number
  customers: number
  revenue: number
  productsTrend?: Trend
  ordersTrend?: Trend
  customersTrend?: Trend
  revenueTrend?: Trend
}

function computeTrend(current: number, before: number): Trend | undefined {
  if (before === 0) {
    if (current === 0) return undefined
    return { value: 100, direction: 'up' }
  }
  const pct = ((current - before) / before) * 100
  return { value: pct, direction: pct >= 0 ? 'up' : 'down' }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, customers: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [chartYear, setChartYear] = useState(new Date().getFullYear())
  const [chartData, setChartData] = useState<{ month: string; revenus: number }[]>(
    MONTH_LABELS.map(month => ({ month, revenus: 0 }))
  )
  const [chartLoading, setChartLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true)
  const [failedSearches, setFailedSearches] = useState<{ query: string; count: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; slug: string; count: number }[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        const { data: searches } = await supabase
          .from('search_logs')
          .select('query')
          .eq('results_count', 0)
          .order('created_at', { ascending: false })
          .limit(500)

        const searchCounts = new Map<string, number>()
        for (const s of searches || []) {
          const key = s.query.toLowerCase().trim()
          searchCounts.set(key, (searchCounts.get(key) || 0) + 1)
        }
        setFailedSearches(
          Array.from(searchCounts.entries())
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        )

        const { data: views } = await supabase
          .from('product_views')
          .select('product_id')
          .order('created_at', { ascending: false })
          .limit(1000)

        const viewCounts = new Map<string, number>()
        for (const v of views || []) {
          viewCounts.set(v.product_id, (viewCounts.get(v.product_id) || 0) + 1)
        }
        const topProductIds = Array.from(viewCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        if (topProductIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, name, slug')
            .in('id', topProductIds.map(([id]) => id))

          const productsById = new Map((productsData || []).map((p: any) => [p.id, p]))
          setTopProducts(
            topProductIds.map(([id, count]) => ({
              name: productsById.get(id)?.name || 'Produit supprimé',
              slug: productsById.get(id)?.slug || '',
              count
            }))
          )
        } else {
          setTopProducts([])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des analytics:', error)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, status, total_fcfa, created_at, profiles(email, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error
        setRecentOrders((data as unknown as Order[]) || [])
      } catch (error) {
        console.error('Erreur lors du chargement des dernières commandes:', error)
      } finally {
        setRecentOrdersLoading(false)
      }
    }

    fetchRecentOrders()
  }, [])

  useEffect(() => {
    const fetchMonthlyRevenue = async () => {
      setChartLoading(true)
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        const startOfYear = new Date(chartYear, 0, 1).toISOString()
        const startOfNextYear = new Date(chartYear + 1, 0, 1).toISOString()

        const { data } = await supabase
          .from('orders')
          .select('total_fcfa, created_at')
          .gte('created_at', startOfYear)
          .lt('created_at', startOfNextYear)
          .not('status', 'in', '(cancelled,refunded)')

        const monthlyTotals = new Array(12).fill(0)
        for (const order of data || []) {
          const monthIndex = new Date(order.created_at).getMonth()
          monthlyTotals[monthIndex] += order.total_fcfa || 0
        }

        setChartData(MONTH_LABELS.map((month, i) => ({ month, revenus: monthlyTotals[i] })))
      } catch (error) {
        console.error('Erreur lors du chargement du graphique de revenus:', error)
      } finally {
        setChartLoading(false)
      }
    }

    fetchMonthlyRevenue()
  }, [chartYear])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        const now = new Date()
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

        const [
          productsNow, productsBefore,
          ordersNow, ordersBefore,
          customersNow, customersBefore,
          revenueThisMonthRes, revenueLastMonthRes
        ] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }).lt('created_at', startOfThisMonth),
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id', { count: 'exact', head: true }).lt('created_at', startOfThisMonth),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).lt('created_at', startOfThisMonth),
          supabase.from('orders').select('total_fcfa').gte('created_at', startOfThisMonth).not('status', 'in', '(cancelled,refunded)'),
          supabase.from('orders').select('total_fcfa').gte('created_at', startOfLastMonth).lt('created_at', startOfThisMonth).not('status', 'in', '(cancelled,refunded)')
        ])

        const revenueThisMonth = (revenueThisMonthRes.data || []).reduce((sum, o: any) => sum + (o.total_fcfa || 0), 0)
        const revenueLastMonth = (revenueLastMonthRes.data || []).reduce((sum, o: any) => sum + (o.total_fcfa || 0), 0)

        setStats({
          products: productsNow.count || 0,
          orders: ordersNow.count || 0,
          customers: customersNow.count || 0,
          revenue: revenueThisMonth,
          productsTrend: computeTrend(productsNow.count || 0, productsBefore.count || 0),
          ordersTrend: computeTrend(ordersNow.count || 0, ordersBefore.count || 0),
          customersTrend: computeTrend(customersNow.count || 0, customersBefore.count || 0),
          revenueTrend: computeTrend(revenueThisMonth, revenueLastMonth)
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
      label: 'Clients',
      value: stats.customers,
      icon: Users,
      iconBg: 'bg-gold/10',
      iconColor: 'text-gold',
      trend: stats.customersTrend,
      href: '/admin/customers'
    },
    {
      label: 'Commandes',
      value: stats.orders,
      icon: ShoppingCart,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      trend: stats.ordersTrend,
      href: '/admin/orders'
    },
    {
      label: 'Revenus ce mois (FCFA)',
      value: formatAmount(stats.revenue),
      icon: Wallet,
      iconBg: 'bg-green/10',
      iconColor: 'text-green-bright',
      trend: stats.revenueTrend,
      href: '/admin/orders'
    },
    {
      label: 'Produits',
      value: stats.products,
      icon: Package,
      // Le violet ne fait pas partie de la palette : les quatre cartes
      // reprennent l'accent, l'information et le succès, plus le doré atténué.
      iconBg: 'bg-gold-dim/10',
      iconColor: 'text-gold-dim',
      trend: stats.productsTrend,
      href: '/admin/products'
    }
  ]

  return (
    <div>
      <h1 className="font-serif font-semibold text-4xl text-ink mb-2">Tableau de bord</h1>
      <p className="text-ink-dim mb-12">Bienvenue dans l&apos;administration Cacao</p>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-bg-panel rounded-2xl border border-border p-6 animate-pulse">
              <div className="h-11 w-11 bg-border rounded-full mb-4"></div>
              <div className="h-8 bg-border rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-border rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {statCards.map((card, idx) => (
            <StatCard key={idx} {...card} />
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="mb-12">
        {chartLoading ? (
          <div className="bg-bg-panel rounded-2xl border border-border p-6 animate-pulse">
            <div className="h-6 bg-border rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-border rounded"></div>
          </div>
        ) : (
          <RevenueChart
            data={chartData}
            year={chartYear}
            onYearChange={setChartYear}
            years={[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]}
          />
        )}
      </div>

      {/* Recent Orders */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-semibold text-xl text-ink">Dernières commandes</h2>
          <Link href="/admin/orders" className="text-sm text-gold font-semibold hover:underline">
            Voir tout →
          </Link>
        </div>
        <TableShell
          columns={
            [
              { key: 'order_number', header: 'Commande', render: (o: Order) => <span className="font-medium text-ink">{o.order_number}</span> },
              {
                key: 'client',
                header: 'Client',
                render: (o: Order) => {
                  const name = `${o.profiles?.first_name || ''} ${o.profiles?.last_name || ''}`.trim() || o.profiles?.email || 'Client'
                  return (
                    <div className="flex items-center gap-3">
                      <Avatar name={name} size="sm" />
                      <span className="text-ink-dim">{name}</span>
                    </div>
                  )
                }
              },
              { key: 'total', header: 'Total', render: (o: Order) => `${formatAmount(o.total_fcfa)} FCFA` },
              {
                key: 'status',
                header: 'Statut',
                render: (o: Order) => {
                  const status = orderStatusLabels[o.status] || { label: o.status, tone: 'neutral' as StatusTone }
                  return <StatusBadge label={status.label} tone={status.tone} />
                }
              },
              { key: 'date', header: 'Date', render: (o: Order) => new Date(o.created_at).toLocaleDateString('fr-CI') }
            ] as Column<Order>[]
          }
          rows={recentOrders}
          rowKey={(o: Order) => o.id}
          loading={recentOrdersLoading}
          emptyMessage="Aucune commande pour le moment"
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-bg-panel rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <SearchX size={18} className="text-gold" />
            <h2 className="font-serif font-semibold text-lg text-ink">Recherches sans résultat</h2>
          </div>
          {analyticsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-5 bg-border rounded animate-pulse"></div>)}
            </div>
          ) : failedSearches.length > 0 ? (
            <ul className="space-y-3">
              {failedSearches.map(s => (
                <li key={s.query} className="flex items-center justify-between text-sm">
                  <span className="text-ink">« {s.query} »</span>
                  <span className="text-ink-dimmer">{s.count}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-dimmer">Aucune recherche infructueuse pour le moment.</p>
          )}
          <p className="text-xs text-ink-dimmer mt-4 pt-4 border-t border-border">
            Produits recherchés par les clients mais absents du catalogue — pistes pour de futurs ajouts.
          </p>
        </div>

        <div className="bg-bg-panel rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-gold" />
            <h2 className="font-serif font-semibold text-lg text-ink">Produits les plus vus</h2>
          </div>
          {analyticsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-5 bg-border rounded animate-pulse"></div>)}
            </div>
          ) : topProducts.length > 0 ? (
            <ul className="space-y-3">
              {topProducts.map(p => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  {p.slug ? (
                    <Link href={`/products/${p.slug}`} className="text-ink hover:text-gold truncate">
                      {p.name}
                    </Link>
                  ) : (
                    <span className="text-ink truncate">{p.name}</span>
                  )}
                  <span className="text-ink-dimmer flex-shrink-0 ml-2">{p.count} vue{p.count !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-dimmer">Aucune vue enregistrée pour le moment.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-bg-panel rounded-2xl border border-border p-8">
        <h2 className="font-serif font-semibold text-2xl text-ink mb-6">Actions rapides</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/products?action=create"
            className="flex flex-col items-center gap-2 p-4 border-2 border-gold rounded-xl hover:bg-gold/10 transition-colors text-center"
          >
            <Plus size={22} className="text-gold" />
            <p className="font-semibold text-ink">Ajouter un produit</p>
            <p className="text-sm text-ink-dim">Créer un nouveau produit</p>
          </a>

          <a
            href="/admin/shipping"
            className="flex flex-col items-center gap-2 p-4 border-2 border-gold rounded-xl hover:bg-gold/10 transition-colors text-center"
          >
            <Settings size={22} className="text-gold" />
            <p className="font-semibold text-ink">Gérer livraison</p>
            <p className="text-sm text-ink-dim">Configurer frais et villes</p>
          </a>

          <a
            href="/admin/orders"
            className="flex flex-col items-center gap-2 p-4 border-2 border-gold rounded-xl hover:bg-gold/10 transition-colors text-center"
          >
            <ClipboardList size={22} className="text-gold" />
            <p className="font-semibold text-ink">Voir commandes</p>
            <p className="text-sm text-ink-dim">Gérer les commandes clients</p>
          </a>

          <a
            href="/admin/customers"
            className="flex flex-col items-center gap-2 p-4 border-2 border-gold rounded-xl hover:bg-gold/10 transition-colors text-center"
          >
            <Users size={22} className="text-gold" />
            <p className="font-semibold text-ink">Clients</p>
            <p className="text-sm text-ink-dim">Liste des utilisateurs</p>
          </a>
        </div>
      </div>
    </div>
  )
}
