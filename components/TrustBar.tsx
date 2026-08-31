import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react'

/**
 * Bandeau de réassurance.
 *
 * Chaque promesse est réellement tenue : paiement MoneyFusion, code de
 * livraison remis à la réception, retour sous 14 jours, messagerie client.
 * Aucun délai d'expédition ni contrôle qualité n'est annoncé ici : ces
 * étapes dépendent du fournisseur et ne peuvent pas être garanties.
 */
const items = [
  { icon: ShieldCheck, title: 'Paiement sécurisé', detail: 'Wave, Orange, MTN, Moov, carte' },
  { icon: Truck, title: 'Moins de 5 jours', detail: 'Livraison suivie' },
  { icon: RotateCcw, title: 'Retour 14 jours', detail: 'Sans justification' },
  { icon: Headphones, title: 'Assistance CACAO', detail: 'Une question ? On répond' }
]

export function TrustBar() {
  return (
    <div className="bg-bg-panel border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, detail }, i) => (
          <div
            key={title}
            className={`flex items-center gap-2.5 py-3 pr-3 ${i % 2 === 0 ? 'border-r border-border' : ''} ${
              i < 2 ? 'border-b border-border lg:border-b-0' : ''
            } ${i === 1 || i === 2 ? 'lg:border-r lg:border-border' : ''} lg:pl-4 lg:first:pl-0`}
          >
            <span className="w-8 h-8 rounded-lg bg-accent/12 border border-accent/25 text-accent flex items-center justify-center flex-shrink-0">
              <Icon size={15} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-ink leading-tight truncate">{title}</span>
              <span className="block text-[11px] text-ink-dimmer leading-tight truncate">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
