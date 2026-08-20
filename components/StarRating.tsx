import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: number
  showCount?: boolean
}

export function StarRating({ rating, reviewCount, size = 14, showCount = true }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <Star size={size} className="fill-[#FF6600] text-[#FF6600]" />
      <span className="text-sm font-semibold text-[#1A1A1A]">{rating.toFixed(1).replace('.', ',')}</span>
      {showCount && typeof reviewCount === 'number' && (
        <span className="text-sm text-[#8A8579]">({reviewCount})</span>
      )}
    </div>
  )
}
