import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react'

/**
 * Bandeau de réassurance affiché sur toutes les pages du site.
 *
 * Chaque promesse est réellement tenue par la boutique : paiement MoneyFusion,
 * code de livraison remis à la réception, retour sous 14 jours, messagerie
 * client. Rien n'est annoncé ici qui ne soit pas implémenté.
 */
const items = [
  { icon: ShieldCheck, title: 'Paiement sécurisé', detail: 'Wave, Orange, MTN, Moov, carte' },
  { icon: Truck, title: 'Livraison suivie', detail: 'Code remis à la réception' },
  { icon: RotateCcw, title: 'Retour sous 14 jours', detail: 'Si le produit ne convient pas' },
  { icon: Headphones, title: 'Assistance CACAO', detail: 'Une question ? On répond' }
]

export function TrustBar() {
  return (
    <div className="bg-[#FDF6F1] border-b border-[#E8E0D8]">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 grid grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, detail }, i) => (
          <div
            key={title}
            className={`flex items-center gap-2.5 py-2.5 pr-3 ${
              i < items.length - 1 ? 'lg:border-r lg:border-[#EFE2D8]' : ''
            } ${i % 2 === 0 ? 'border-r border-[#EFE2D8] lg:border-r' : ''} ${i < 2 ? 'border-b border-[#EFE2D8] lg:border-b-0' : ''} lg:pl-4 first:lg:pl-0`}
          >
            <span className="w-7 h-7 rounded-lg bg-[#C2410C] text-white flex items-center justify-center flex-shrink-0">
              <Icon size={14} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-[#241A14] leading-tight truncate">{title}</span>
              <span className="block text-[11px] text-[#7D6A5D] leading-tight truncate">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
