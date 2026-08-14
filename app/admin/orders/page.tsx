'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import OrderDetailModal from '@/components/admin/OrderDetailModal'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price_fcfa: number
  subtotal_fcfa: number
}

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_fcfa: number
  total_products_fcfa: number
  shipping_cost_fcfa: number
  payment_method: string
  created_at: string
  profiles?: {
    email: string
    first_name: string
    last_name: string
  }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'Préparation', color: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Remboursée', color: 'bg-red-100 text-red-700' }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      let query = supabase
        .from('orders')
        .select('id, order_number, user_id, status, total_fcfa, total_products_fcfa, shipping_cost_fcfa, payment_method, created_at, profiles(email, first_name, last_name)')
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
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
        .select('id, product_name, quantity, unit_price_fcfa, subtotal_fcfa')
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
      const { error } = await (supabase
        .from('orders')
        .update({ status: newStatus } as Record<string, any>)
        .eq('id', orderId) as any)

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A] mb-6">Commandes</h1>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              statusFilter === ''
                ? 'bg-[#1A1A1A] text-white'
                : 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white'
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
                  ? 'bg-[#1A1A1A] text-white'
                  : 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-4 animate-pulse">
              <div className="h-6 bg-[#E4DDCF] rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-[#E4DDCF] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FBF6EE] border-b border-[#E4DDCF]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Commande</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Client</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Date</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-t border-[#E4DDCF] hover:bg-[#FBF6EE] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm text-[#56534C]">
                    {order.profiles?.first_name} {order.profiles?.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">
                    {order.total_fcfa.toLocaleString('fr-CI')} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusLabels[order.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[order.status]?.label || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#56534C]">
                    {new Date(order.created_at).toLocaleDateString('fr-CI')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="px-3 py-1 text-sm bg-[#E85D25] text-white rounded hover:bg-[#d04a1a] transition-colors"
                    >
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-12 text-center">
          <p className="text-[#56534C]">Aucune commande trouvée</p>
        </div>
      )}

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
