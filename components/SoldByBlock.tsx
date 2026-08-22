import { ShieldCheck } from 'lucide-react'

interface SoldByBlockProps {
  sellerName?: string
}

// Lit le vrai vendeur (table `sellers`, un seul aujourd'hui : CACAO) au lieu d'un
// texte en dur — prêt à afficher un vendeur tiers plus tard sans changer ce composant.
export function SoldByBlock({ sellerName = 'CACAO' }: SoldByBlockProps) {
  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#E4DDCF]">
      <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
        <ShieldCheck size={16} className="text-[#FF6600]" />
      </div>
      <div>
        <p className="text-sm text-[#1A1A1A]">
          Vendu et expédié par <span className="font-semibold">{sellerName}</span>
        </p>
        <p className="text-xs text-[#8A8579]">Produit vérifié, livraison suivie</p>
      </div>
    </div>
  )
}
