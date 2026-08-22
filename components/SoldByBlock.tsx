import { ShieldCheck } from 'lucide-react'

interface SoldByBlockProps {
  sellerName?: string
}

// Lit le vrai vendeur (table `sellers`, un seul aujourd'hui : CACAO) au lieu d'un
// texte en dur — prêt à afficher un vendeur tiers plus tard sans changer ce composant.
export function SoldByBlock({ sellerName = 'CACAO' }: SoldByBlockProps) {
  return (
    <div className="flex items-center gap-3 p-4 my-4 bg-white border border-[#E4DDCF] rounded-xl">
      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white font-semibold flex items-center justify-center flex-shrink-0">
        {sellerName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#1A1A1A] flex items-center gap-1.5">
          <span className="font-semibold truncate">{sellerName}</span>
          <ShieldCheck size={14} className="text-[#FF6600] flex-shrink-0" />
        </p>
        <p className="text-xs text-[#8A8579]">Vendu et expédié par {sellerName} · Produit vérifié</p>
      </div>
    </div>
  )
}
