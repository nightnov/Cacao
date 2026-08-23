import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'
import { StarRating } from '@/components/StarRating'
import { formatAmount } from '@/lib/format'

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
  const discount = hasPromo
    ? Math.round(((compare_at_price_fcfa! - price_fcfa) / compare_at_price_fcfa!) * 100)
    : 0
  const isNew = !!created_at && Date.now() - new Date(created_at).getTime() < NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  const summary = specsSummary(specs)

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col bg-[#1C2021] border border-[#35383C] rounded-xl overflow-hidden transition-all duration-200 hover:border-[#4E5257] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDC700] focus-visible:ring-offset-2 focus-visible:ring-offset-[#222427]"
    >
      <div className="relative h-[132px] sm:h-[158px] bg-[#171A1C] flex items-center justify-center overflow-hidden flex-shrink-0">
        {image_urls && image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_urls[0]}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#3E4247" strokeWidth="1.4" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        {/* Un seul badge : la remise chiffrée prime sur la nouveauté */}
        {hasPromo ? (
          <span className="absolute top-2.5 left-2.5 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-white bg-[#00A63E] tabular-nums tracking-wide">
            -{discount}%
          </span>
        ) : isNew ? (
          <span className="absolute top-2.5 left-2.5 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-[#1A1A1A] bg-[#FDC700] tracking-wide">
            NOUVEAU
          </span>
        ) : null}

        <FavoriteButton
          productId={id}
          size={14}
          className="absolute top-2 right-2 w-7 h-7 bg-black/45 border border-[#45484C] text-[#B3B8BE]"
        />
      </div>

      <div className="flex flex-col flex-1 px-3.5 pt-3.5 pb-4">
        {/* Nom en display : les références PC sont longues, deux lignes maximum */}
        <h3 className="font-display text-[14.5px] text-[#EEF2F7] line-clamp-2 min-h-[2.4rem] leading-[1.2] group-hover:text-[#FDC700] transition-colors">
          {name}
        </h3>

        {summary && (
          <p className="text-[10.5px] text-[#8E959D] leading-[1.5] mt-1.5 line-clamp-2">{summary}</p>
        )}

        {!!review_count && avg_rating != null && (
          <div className="mt-2">
            <StarRating rating={avg_rating} reviewCount={review_count} size={11} compact />
          </div>
        )}

        <div className="mt-auto pt-2.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-[17px] text-[#EEF2F7] tabular-nums leading-tight">
            {formatAmount(price_fcfa)} FCFA
          </span>
          {hasPromo && (
            <span className="text-[11px] text-[#6F767E] line-through tabular-nums">
              {formatAmount(compare_at_price_fcfa!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
