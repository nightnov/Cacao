'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import OrderDetailModal from '@/components/admin/OrderDetailModal'
import { TableShell, Column } from '@/components/admin/TableShell'
import { StatusBadge, StatusTone } from '@/components/admin/StatusBadge'
import { IconButton } from '@/components/admin/IconButton'
import { Pagination } from '@/components/admin/Pagination'
import { Avatar } from '@/components/admin/Avatar'
import { Order, OrderItem } from '@/types/admin'
import { formatAmount } from '@/lib/format'

const statusLabels: Record<string, { label: string; tone: StatusTone }> = {
  // Commandes sur mesure. « Prix à confirmer » attend une action de votre part
  // et porte donc la teinte d'alerte : c'est le seul état où le client ne peut
  // pas avancer sans vous.
  awaiting_quote: { label: 'Prix à confirmer', tone: 'pending' },
  quoted: { label: 'Prix confirmé', tone: 'info' },
  pending: { label: 'En attente', tone: 'neutral' },
  confirmed: { label: 'Confirmée', tone: 'info' },
  preparing: { label: 'Préparation', tone: 'pending' },
  shipped: { label: 'Expédiée', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'danger' },
  refunded: { label: 'Remboursée', tone: 'danger' }
}

const PAGE_SIZE = 10

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  // Le filtre se lit dans l'adresse. C'est ce qui permet aux compteurs du
  // tableau de bord d'ouvrir directement la bonne liste : sans cela, le lien
  // arrivait ici et affichait toutes les commandes, ce qui donne l'impression
  // que le compteur s'est trompé.
  const searchParams = useSearchParams()
  const requested = searchParams.get('status') || ''
  const [statusFilter, setStatusFilter] = useState<string>(
    requested in statusLabels ? requested : ''
  )
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchOrders()
    setPage(1)
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      let query = supabase
        .from('orders')
        .select('id, order_number, user_id, status, total_fcfa, total_products_fcfa, shipping_cost_fcfa, payment_method, created_at, delivery_code, delivered_at, notes, is_custom_order, estimated_total_fcfa, quoted_price_fcfa, customer_request, shipping_address, profiles(email, first_name, last_name)')
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      // Supabase type la jointure profiles comme un tableau, mais renvoie un objet unique à l'exécution
      setOrders((data as unknown as Order[]) || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (order: Order) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('order_items')
        .select('id, product_name, quantity, unit_price_fcfa, subtotal_fcfa, variant_label')
        .eq('order_id', order.id)

      if (error) throw error
      setOrderItems(data || [])
      setSelectedOrder(order)
    } catch (error) {
      alert('Erreur lors du chargement des détails')
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
      alert('Statut mis à jour')
    } catch (error) {
      alert('Erreur lors de la mise à jour')
    }
  }

  const pagedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Order>[] = [
    { key: 'order_number', header: 'Commande', render: o => <span className="font-medium text-ink">{o.order_number}</span> },
    {
      key: 'client',
      header: 'Client',
      render: o => {
        const name = `${o.profiles?.first_name || ''} ${o.profiles?.last_name || ''}`.trim() || o.profiles?.email || 'Client'
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="sm" />
            <span className="text-ink-dim">{name}</span>
          </div>
        )
      }
    },
    { key: 'total', header: 'Total', render: o => `${formatAmount(o.total_fcfa)} FCFA` },
    {
      key: 'status',
      header: 'Statut',
      render: o => {
        const status = statusLabels[o.status] || { label: o.status, tone: 'neutral' as StatusTone }
        return <StatusBadge label={status.label} tone={status.tone} />
      }
    },
    { key: 'date', header: 'Date', render: o => new Date(o.created_at).toLocaleDateString('fr-CI') },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: o => (
        <div className="flex justify-end">
          <IconButton icon={Eye} label="Voir détails" onClick={() => handleViewDetails(o)} />
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-4xl text-ink mb-6">Commandes</h1>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              statusFilter === ''
                ? 'bg-ink text-ink-invert'
                : 'border-2 border-ink text-ink hover:bg-ink hover:text-ink-invert'
            }`}
          >
            Toutes
          </button>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                statusFilter === key
                  ? 'bg-ink text-ink-invert'
                  : 'border-2 border-ink text-ink hover:bg-ink hover:text-ink-invert'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <TableShell
        columns={columns}
        rows={pagedOrders}
        rowKey={o => o.id}
        loading={loading}
        emptyMessage="Aucune commande trouvée"
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={orders.length} onPageChange={setPage} />}
      />

      {/* Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          items={orderItems}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
