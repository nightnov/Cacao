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
  const [linkCopied, setLinkCopied] = useState(false)

  // La même adresse pour tous les colis : le livreur l'enregistre une fois.
  // Construite dans le navigateur plutôt qu'écrite en dur, pour rester juste
  // en développement local comme sur le domaine de production.
  const deliveryLink =
    typeof window !== 'undefined' ? `${window.location.origin}/livraison` : ''

  const handleStatusChange = async () => {
    const next = nextStatus[order.status]
    if (!next) return

    setUpdating(true)
    await onStatusChange(order.id, next)
    setUpdating(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-panel rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink">
              Commande {order.order_number}
            </h2>
            <p className="text-ink-dim text-sm mt-1">
              {new Date(order.created_at).toLocaleDateString('fr-CI')} à {new Date(order.created_at).toLocaleTimeString('fr-CI')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-dimmer hover:text-ink text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="bg-bg-raised rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ink">Statut actuel</h3>
              <span className="px-3 py-1 bg-gold text-ink-invert rounded-full text-sm font-semibold">
                {statusLabels[order.status]}
              </span>
            </div>
            {nextStatus[order.status] && (
              <button
                onClick={handleStatusChange}
                disabled={updating}
                className="w-full px-4 py-2 bg-gold text-ink-invert rounded-lg hover:bg-gold-dim transition-colors font-semibold disabled:opacity-50"
              >
                {updating ? 'Mise à jour...' : `Passer à ${statusLabels[nextStatus[order.status]]}`}
              </button>
            )}
          </div>

          {/* Client Info */}
          <div>
            <h3 className="font-semibold text-ink mb-3">Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-dimmer uppercase font-semibold mb-1">Nom</p>
                <p className="text-ink">{order.profiles?.first_name} {order.profiles?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-ink-dimmer uppercase font-semibold mb-1">Email</p>
                <p className="text-ink">{order.profiles?.email}</p>
              </div>
              <div>
                <p className="text-xs text-ink-dimmer uppercase font-semibold mb-1">Téléphone</p>
                <p className="text-ink">{order.profiles?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-dimmer uppercase font-semibold mb-1">Paiement</p>
                <p className="text-ink">{order.payment_method || '-'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div>
              <h3 className="font-semibold text-ink mb-3">Adresse de livraison</h3>
              <div className="bg-bg-raised rounded-lg p-4 border border-border">
                <p className="text-ink">{order.shipping_address.address}</p>
                <p className="text-ink-dim text-sm">{order.shipping_address.city}</p>

                {/* Position partagée par le client. À Abidjan, une adresse
                    écrite suffit rarement à retrouver quelqu'un ; un point sur
                    la carte, si. Absent si le client a refusé de la partager. */}
                {order.delivery_lat != null && order.delivery_lng != null && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
                    >
                      <MapPin size={14} /> Ouvrir la position sur la carte
                    </a>
                    <p className="text-xs text-ink-dimmer mt-1">
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
              <h3 className="font-semibold text-ink mb-3">Code de livraison</h3>
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                <p className="text-2xl font-bold text-ink tracking-widest">{order.delivery_code}</p>
                <p className="text-xs text-ink-dim mt-1">
                  Le client doit donner ce code au livreur uniquement à la remise du colis, pour confirmer la bonne réception.
                </p>
              </div>
            </div>
          )}

          {/* Lien du livreur : c'est lui qui rend le code utilisable. Sans ce
              lien, le livreur n'a aucun moyen de vérifier quoi que ce soit. */}
          {order.delivery_code && (
            <div>
              <h3 className="font-semibold text-ink mb-3">Lien du livreur</h3>
              <div className="bg-bg-raised rounded-lg p-4 border border-border">
                {order.delivered_at ? (
                  <p className="text-sm text-ink">
                    Livraison confirmée le{' '}
                    {new Date(order.delivered_at).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                    .
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-ink-dim mb-3">
                      Même adresse pour tous les colis : le livreur l&apos;enregistre une fois. Il y
                      saisira le code que le client lui donnera à la remise. Ne le transmettez
                      jamais au client.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(deliveryLink)
                        setLinkCopied(true)
                        setTimeout(() => setLinkCopied(false), 2500)
                      }}
                      className="px-4 py-2 bg-ink text-ink-invert rounded-lg text-sm font-semibold hover:bg-ink-dim transition-colors"
                    >
                      {linkCopied ? 'Lien copié' : 'Copier le lien du livreur'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Order notes */}
          {order.notes && (
            <div>
              <h3 className="font-semibold text-ink mb-3">Notes du client</h3>
              <div className="bg-bg-raised rounded-lg p-4 border border-border">
                <p className="text-ink text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-ink mb-3">Produits commandés</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-bg-raised rounded-lg p-4 border border-border">
                  <div>
                    <p className="font-medium text-ink">{item.product_name}</p>
                    {item.variant_label && (
                      <p className="text-xs text-ink-dimmer">{item.variant_label}</p>
                    )}
                    <p className="text-sm text-ink-dim">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">
                      {formatAmount(item.subtotal_fcfa)} FCFA
                    </p>
                    <p className="text-sm text-ink-dim">
                      {formatAmount(item.unit_price_fcfa)} FCFA x {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-border pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-ink-dim">
                <span>Produits</span>
                <span>{formatAmount(order.total_products_fcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-ink-dim">
                <span>Livraison</span>
                <span>{formatAmount(order.shipping_cost_fcfa)} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-ink pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-gold">{formatAmount(order.total_fcfa)} FCFA</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border-2 border-ink text-ink rounded-lg hover:bg-ink hover:text-ink-invert transition-colors font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
