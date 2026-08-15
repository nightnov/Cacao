'use client'

import { useState } from 'react'
import { Order, OrderItem } from '@/types/admin'

const nextStatus: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered'
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée'
}

interface OrderDetailModalProps {
  order: Order
  items: OrderItem[]
  onClose: () => void
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>
}

export default function OrderDetailModal({ order, items, onClose, onStatusChange }: OrderDetailModalProps) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async () => {
    const next = nextStatus[order.status]
    if (!next) return

    setUpdating(true)
    await onStatusChange(order.id, next)
    setUpdating(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E4DDCF] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A]">
              Commande {order.order_number}
            </h2>
            <p className="text-[#56534C] text-sm mt-1">
              {new Date(order.created_at).toLocaleDateString('fr-CI')} à {new Date(order.created_at).toLocaleTimeString('fr-CI')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8579] hover:text-[#1A1A1A] text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="bg-[#FBF6EE] rounded-lg p-4 border border-[#E4DDCF]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1A1A1A]">Statut actuel</h3>
              <span className="px-3 py-1 bg-[#FF6600] text-white rounded-full text-sm font-semibold">
                {statusLabels[order.status]}
              </span>
            </div>
            {nextStatus[order.status] && (
              <button
                onClick={handleStatusChange}
                disabled={updating}
                className="w-full px-4 py-2 bg-[#FF6600] text-white rounded-lg hover:bg-[#E65C00] transition-colors font-semibold disabled:opacity-50"
              >
                {updating ? 'Mise à jour...' : `Passer à ${statusLabels[nextStatus[order.status]]}`}
              </button>
            )}
          </div>

          {/* Client Info */}
          <div>
            <h3 className="font-semibold text-[#1A1A1A] mb-3">Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#8A8579] uppercase font-semibold mb-1">Nom</p>
                <p className="text-[#1A1A1A]">{order.profiles?.first_name} {order.profiles?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#8A8579] uppercase font-semibold mb-1">Email</p>
                <p className="text-[#1A1A1A]">{order.profiles?.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#8A8579] uppercase font-semibold mb-1">Téléphone</p>
                <p className="text-[#1A1A1A]">{order.profiles?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[#8A8579] uppercase font-semibold mb-1">Paiement</p>
                <p className="text-[#1A1A1A]">{order.payment_method || '-'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-3">Adresse de livraison</h3>
              <div className="bg-[#FBF6EE] rounded-lg p-4 border border-[#E4DDCF]">
                <p className="text-[#1A1A1A]">{order.shipping_address.address}</p>
                <p className="text-[#56534C] text-sm">{order.shipping_address.city}</p>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-[#1A1A1A] mb-3">Produits commandés</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-[#FBF6EE] rounded-lg p-4 border border-[#E4DDCF]">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{item.product_name}</p>
                    {item.variant_label && (
                      <p className="text-xs text-[#8A8579]">{item.variant_label}</p>
                    )}
                    <p className="text-sm text-[#56534C]">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1A1A1A]">
                      {item.subtotal_fcfa.toLocaleString('fr-CI')} FCFA
                    </p>
                    <p className="text-sm text-[#56534C]">
                      {item.unit_price_fcfa.toLocaleString('fr-CI')} FCFA x {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-[#E4DDCF] pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[#56534C]">
                <span>Produits</span>
                <span>{order.total_products_fcfa.toLocaleString('fr-CI')} FCFA</span>
              </div>
              <div className="flex justify-between text-[#56534C]">
                <span>Livraison</span>
                <span>{order.shipping_cost_fcfa.toLocaleString('fr-CI')} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#1A1A1A] pt-2 border-t border-[#E4DDCF]">
                <span>Total</span>
                <span className="text-[#FF6600]">{order.total_fcfa.toLocaleString('fr-CI')} FCFA</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border-2 border-[#1A1A1A] text-[#1A1A1A] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
