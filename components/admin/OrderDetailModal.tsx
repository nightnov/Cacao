'use client'

import { useState } from 'react'
import { Order, OrderItem } from '@/types/admin'
import { formatAmount } from '@/lib/format'
import { MapPin } from 'lucide-react'

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
        <div className="sticky top-0 bg-white border-b border-[#E8E0D8] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-[#241A14]">
              Commande {order.order_number}
            </h2>
            <p className="text-[#5B4B41] text-sm mt-1">
              {new Date(order.created_at).toLocaleDateString('fr-CI')} à {new Date(order.created_at).toLocaleTimeString('fr-CI')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7D6A5D] hover:text-[#241A14] text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="bg-[#FAF7F4] rounded-lg p-4 border border-[#E8E0D8]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#241A14]">Statut actuel</h3>
              <span className="px-3 py-1 bg-[#C2410C] text-white rounded-full text-sm font-semibold">
                {statusLabels[order.status]}
              </span>
            </div>
            {nextStatus[order.status] && (
              <button
                onClick={handleStatusChange}
                disabled={updating}
                className="w-full px-4 py-2 bg-[#C2410C] text-white rounded-lg hover:bg-[#9A3412] transition-colors font-semibold disabled:opacity-50"
              >
                {updating ? 'Mise à jour...' : `Passer à ${statusLabels[nextStatus[order.status]]}`}
              </button>
            )}
          </div>

          {/* Client Info */}
          <div>
            <h3 className="font-semibold text-[#241A14] mb-3">Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#7D6A5D] uppercase font-semibold mb-1">Nom</p>
                <p className="text-[#241A14]">{order.profiles?.first_name} {order.profiles?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#7D6A5D] uppercase font-semibold mb-1">Email</p>
                <p className="text-[#241A14]">{order.profiles?.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#7D6A5D] uppercase font-semibold mb-1">Téléphone</p>
                <p className="text-[#241A14]">{order.profiles?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[#7D6A5D] uppercase font-semibold mb-1">Paiement</p>
                <p className="text-[#241A14]">{order.payment_method || '-'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div>
              <h3 className="font-semibold text-[#241A14] mb-3">Adresse de livraison</h3>
              <div className="bg-[#FAF7F4] rounded-lg p-4 border border-[#E8E0D8]">
                <p className="text-[#241A14]">{order.shipping_address.address}</p>
                <p className="text-[#5B4B41] text-sm">{order.shipping_address.city}</p>

                {/* Position partagée par le client. À Abidjan, une adresse
                    écrite suffit rarement à retrouver quelqu'un ; un point sur
                    la carte, si. Absent si le client a refusé de la partager. */}
                {order.delivery_lat != null && order.delivery_lng != null && (
                  <div className="mt-3 pt-3 border-t border-[#E8E0D8]">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C2410C] hover:underline"
                    >
                      <MapPin size={14} /> Ouvrir la position sur la carte
                    </a>
                    <p className="text-xs text-[#7D6A5D] mt-1">
                      Partagée par le client
                      {order.delivery_accuracy_m != null &&
                        ` · précise à ${order.delivery_accuracy_m} m près`}
                      {order.delivery_distance_km != null &&
                        ` · ${order.delivery_distance_km} km depuis le retrait`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery code */}
          {order.delivery_code && (
            <div>
              <h3 className="font-semibold text-[#241A14] mb-3">Code de livraison</h3>
              <div className="bg-orange-50 border border-[#C2410C]/30 rounded-lg p-4">
                <p className="text-2xl font-bold text-[#241A14] tracking-widest">{order.delivery_code}</p>
                <p className="text-xs text-[#5B4B41] mt-1">
                  Le client doit donner ce code au livreur uniquement à la remise du colis, pour confirmer la bonne réception.
                </p>
              </div>
            </div>
          )}

          {/* Order notes */}
          {order.notes && (
            <div>
              <h3 className="font-semibold text-[#241A14] mb-3">Notes du client</h3>
              <div className="bg-[#FAF7F4] rounded-lg p-4 border border-[#E8E0D8]">
                <p className="text-[#241A14] text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-[#241A14] mb-3">Produits commandés</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-[#FAF7F4] rounded-lg p-4 border border-[#E8E0D8]">
                  <div>
                    <p className="font-medium text-[#241A14]">{item.product_name}</p>
                    {item.variant_label && (
                      <p className="text-xs text-[#7D6A5D]">{item.variant_label}</p>
                    )}
                    <p className="text-sm text-[#5B4B41]">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#241A14]">
                      {formatAmount(item.subtotal_fcfa)} FCFA
                    </p>
                    <p className="text-sm text-[#5B4B41]">
                      {formatAmount(item.unit_price_fcfa)} FCFA x {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-[#E8E0D8] pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[#5B4B41]">
                <span>Produits</span>
                <span>{formatAmount(order.total_products_fcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-[#5B4B41]">
                <span>Livraison</span>
                <span>{formatAmount(order.shipping_cost_fcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#241A14] pt-2 border-t border-[#E8E0D8]">
                <span>Total</span>
                <span className="text-[#C2410C]">{formatAmount(order.total_fcfa)} FCFA</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border-2 border-[#241A14] text-[#241A14] rounded-lg hover:bg-[#241A14] hover:text-white transition-colors font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
