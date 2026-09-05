import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { DeliveryConfirmForm } from '@/components/DeliveryConfirmForm'
import { CARD } from '@/lib/ui'
import { MapPin, Phone, User, PackageCheck } from 'lucide-react'
import type { Metadata } from 'next'

/**
 * Page du livreur.
 *
 * Ouverte depuis un lien envoyé par message, sur un téléphone, par quelqu'un
 * qui n'a pas de compte et ne connaît pas le site. Elle ne montre donc que ce
 * qui sert à remettre le colis, sans en tête ni menu : tout lien vers le reste
 * du site l'éloignerait de la seule action attendue.
 *
 * Aucun montant n'est affiché. Le livreur n'a pas à connaître la valeur de ce
 * qu'il transporte, et le client n'a pas à ce que son achat soit lisible par
 * un tiers.
 */
export const dynamic = 'force-dynamic'

// Une commande en cours de livraison n'a rien à faire dans un moteur de
// recherche : ces pages contiennent une adresse et un téléphone.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Confirmation de livraison'
}

interface ShippingAddress {
  full_name?: string
  phone?: string
  city?: string
  address?: string
}

export default async function DeliveryPage({ params }: { params: { token: string } }) {
  const token = params.token

  const valid = /^[0-9a-f]{64}$/.test(token)
  const { data: order } = valid
    ? await getSupabaseAdmin()
        // delivery_code est volontairement absent : il serait lisible dans la
        // page, et le lien seul suffirait alors à confirmer une livraison qui
        // n'a pas eu lieu.
        .from('orders')
        .select('order_number, status, shipping_address, delivered_at, delivery_attempts')
        .eq('delivery_token', token)
        .maybeSingle()
    : { data: null }

  if (!order) {
    return (
      <main className="min-h-screen bg-bg grid place-items-center px-5">
        <div className="text-center max-w-sm">
          <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Lien introuvable</h1>
          <p className="text-ink-dim text-sm">
            Ce lien de livraison n&apos;existe pas ou n&apos;est plus valable. Contactez le vendeur.
          </p>
        </div>
      </main>
    )
  }

  const address = (order.shipping_address || {}) as ShippingAddress

  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <PackageCheck size={34} strokeWidth={1.6} className="text-accent mx-auto mb-3" />
          <h1 className="font-serif font-semibold text-2xl text-ink">Confirmation de livraison</h1>
          <p className="text-ink-dim text-sm mt-1 tabular-nums">Commande {order.order_number}</p>
        </div>

        <div className={`${CARD} p-5 mb-6 space-y-3.5`}>
          {address.full_name && (
            <p className="flex items-start gap-3 text-[14.5px]">
              <User size={17} className="text-accent flex-shrink-0 mt-0.5" />
              <span className="text-ink font-medium">{address.full_name}</span>
            </p>
          )}
          {address.phone && (
            <p className="flex items-start gap-3 text-[14.5px]">
              <Phone size={17} className="text-accent flex-shrink-0 mt-0.5" />
              {/* Appelable d'un doigt : le livreur cherche presque toujours à
                  joindre le client en arrivant. */}
              <a href={`tel:${address.phone}`} className="text-ink underline underline-offset-2">
                {address.phone}
              </a>
            </p>
          )}
          {(address.address || address.city) && (
            <p className="flex items-start gap-3 text-[14.5px]">
              <MapPin size={17} className="text-accent flex-shrink-0 mt-0.5" />
              <span className="text-ink-dim">
                {[address.address, address.city].filter(Boolean).join(', ')}
              </span>
            </p>
          )}
        </div>

        {order.delivered_at ? (
          <div className={`${CARD} p-6 text-center`}>
            <p className="font-semibold text-ink">Livraison déjà confirmée</p>
            <p className="text-ink-dim text-sm mt-1">Rien de plus à faire.</p>
          </div>
        ) : (order.delivery_attempts ?? 0) >= 5 ? (
          <div className={`${CARD} p-6 text-center`}>
            <p className="font-semibold text-ink">Saisie bloquée</p>
            <p className="text-ink-dim text-sm mt-1">
              Trop de codes erronés. Contactez le vendeur pour confirmer la remise.
            </p>
          </div>
        ) : (
          <div className={`${CARD} p-5`}>
            <DeliveryConfirmForm token={token} />
          </div>
        )}
      </div>
    </main>
  )
}
