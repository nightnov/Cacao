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
    <div className="flex items-center gap-3 p-4 my-4 bg-bg-panel border border-border rounded-xl">
      <div className="w-10 h-10 rounded-full bg-bg-raised text-white font-semibold flex items-center justify-center flex-shrink-0">
        {sellerName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink flex items-center gap-1.5">
          <span className="font-semibold truncate">{sellerName}</span>
          <ShieldCheck size={14} className="text-gold flex-shrink-0" />
        </p>
        <p className="text-xs text-ink-dimmer">
          Vendu et expédié par {sellerName}
          {reviewCount > 0 && (
            <>
              {' · '}
              <span className="inline-flex items-center gap-0.5 align-middle">
                <Star size={11} className="fill-gold text-gold" />
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
