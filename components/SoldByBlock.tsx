import { ShieldCheck, Star } from 'lucide-react'

interface SoldByBlockProps {
  sellerName?: string
  avgRating?: number
  reviewCount?: number
  productCount?: number
}

// Lit le vrai vendeur (table `sellers`, un seul aujourd'hui : CACAO) au lieu d'un
// texte en dur — prêt à afficher un vendeur tiers plus tard sans changer ce composant.
// La note/nombre d'avis sont calculés à partir des vrais avis du vendeur (aucune
// valeur affichée si aucun avis n'existe encore).
export function SoldByBlock({ sellerName = 'CACAO', avgRating = 0, reviewCount = 0, productCount = 0 }: SoldByBlockProps) {
  return (
    <div className="flex items-center gap-3 p-4 my-4 bg-white border border-[#E8E0D8] rounded-xl">
      <div className="w-10 h-10 rounded-full bg-[#241A14] text-white font-semibold flex items-center justify-center flex-shrink-0">
        {sellerName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#241A14] flex items-center gap-1.5">
          <span className="font-semibold truncate">{sellerName}</span>
          <ShieldCheck size={14} className="text-[#C2410C] flex-shrink-0" />
        </p>
        <p className="text-xs text-[#7D6A5D]">
          Vendu et expédié par {sellerName}
          {reviewCount > 0 && (
            <>
              {' · '}
              <span className="inline-flex items-center gap-0.5 align-middle">
                <Star size={11} className="fill-[#C2410C] text-[#C2410C]" />
                {avgRating.toFixed(1)} ({reviewCount} avis)
              </span>
            </>
          )}
          {productCount > 0 && ` · ${productCount} produit${productCount > 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}
