import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: number
  showCount?: boolean
  /** Compact : taille de texte réduite pour les grilles de cartes produit */
  compact?: boolean
}

export function StarRating({ rating, reviewCount, size = 14, showCount = true, compact = false }: StarRatingProps) {
  const textSize = compact ? 'text-[10.5px]' : 'text-sm'

  return (
    <div className="flex items-center gap-1">
      <Star size={size} className="fill-accent text-accent flex-shrink-0" aria-hidden="true" />
      <span className={`${textSize} font-semibold text-ink tabular-nums`}>
        {rating.toFixed(1).replace('.', ',')}
      </span>
      {showCount && typeof reviewCount === 'number' && (
        <span className={`${textSize} text-ink font-semibold tabular-nums`}>
          ({reviewCount} avis)
        </span>
      )}
    </div>
  )
}
