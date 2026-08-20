import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'
import { StarRating } from '@/components/StarRating'

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
  image_urls?: string[]
  created_at?: string
  avg_rating?: number | null
  review_count?: number
  specs?: Record<string, unknown>
}

const NEW_THRESHOLD_DAYS = 14

function specsSummary(specs?: Record<string, unknown>): string | null {
  if (!specs) return null
  const parts = [specs.cpu, specs.ram && `${specs.ram} RAM`, specs.storage].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function ProductCard({
  id,
  name,
  slug,
  price_fcfa,
  compare_at_price_fcfa,
  image_urls,
  created_at,
  avg_rating,
  review_count,
  specs
}: ProductCardProps) {
  const hasPromo = !!compare_at_price_fcfa && compare_at_price_fcfa > price_fcfa
  const isNew = !!created_at && Date.now() - new Date(created_at).getTime() < NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  const summary = specsSummary(specs)

  return (
    <Link href={`/products/${slug}`} className="group block">
      {/* Image */}
      <div className="relative bg-[#FBF6EE] aspect-square rounded-xl overflow-hidden flex items-center justify-center">
        {image_urls && image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_urls[0]}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        {(isNew || hasPromo) && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full text-white ${hasPromo ? 'bg-[#1E7A46]' : 'bg-[#FF6600]'}`}>
            {hasPromo ? 'Bon plan' : 'Nouveau'}
          </span>
        )}

        <FavoriteButton productId={id} size={16} className="absolute top-2 right-2 w-7 h-7" />
      </div>

      {/* Content */}
      <div className="pt-2.5">
        <h3 className="text-sm text-[#1A1A1A] truncate group-hover:text-[#FF6600] transition-colors">
          {name}
        </h3>

        {summary && <p className="text-xs text-[#8A8579] truncate mt-0.5">{summary}</p>}

        {!!review_count && avg_rating != null && (
          <div className="mt-1">
            <StarRating rating={avg_rating} reviewCount={review_count} size={12} />
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-sm font-bold ${hasPromo ? 'text-[#1E7A46]' : 'text-[#1A1A1A]'}`}>
            {price_fcfa.toLocaleString('fr-CI')} FCFA
          </span>
          {hasPromo && (
            <span className="text-xs text-[#8A8579] line-through">
              {compare_at_price_fcfa!.toLocaleString('fr-CI')} FCFA
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
