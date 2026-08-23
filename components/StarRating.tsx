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
      <Star size={size} className="fill-[#C2410C] text-[#C2410C]" />
      <span className="text-sm font-semibold text-[#241A14]">{rating.toFixed(1).replace('.', ',')}</span>
      {showCount && typeof reviewCount === 'number' && (
        <span className="text-sm text-[#7D6A5D]">({reviewCount})</span>
      )}
    </div>
  )
}
