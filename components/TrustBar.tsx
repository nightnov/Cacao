import { ShieldCheck, Truck, Headphones } from 'lucide-react'

const items = [
  { icon: ShieldCheck, label: 'Paiement sécurisé' },
  { icon: Truck, label: 'Livraison suivie' },
  { icon: Headphones, label: 'Assistance CACAO' }
]

export function TrustBar() {
  return (
    <div className="bg-[#F3EDE6] border-b border-[#E8E0D8]">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 py-2.5 flex items-center justify-center gap-8 flex-wrap">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-[#6B4A2E] font-medium">
            <Icon size={14} strokeWidth={2} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
