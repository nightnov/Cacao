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
  availability,
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
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2"
    >
      {/* Visuel */}
      <div className="relative bg-white border border-[#E8E0D8] aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition-shadow duration-200 group-hover:shadow-card-hover">
        {image_urls && image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_urls[0]}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="1" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        {/* Un seul badge à la fois : la remise chiffrée prime sur la nouveauté */}
        {hasPromo ? (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-bold px-2 py-1 rounded-lg text-white bg-[#1E7A46] tabular-nums">
            -{discount}%
          </span>
        ) : isNew ? (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-bold px-2 py-1 rounded-lg text-white bg-[#C2410C]">
            Nouveau
          </span>
        ) : null}

        {availability === 'on_order' && (
          <span className="absolute bottom-2.5 left-2.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/95 text-[#5B4B41] border border-[#E8E0D8]">
            Sur commande
          </span>
        )}

        <FavoriteButton
          productId={id}
          size={15}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/95 shadow-sm"
        />
      </div>

      {/* Informations */}
      <div className="pt-3">
        {/* Deux lignes : les references PC sont longues, une seule ligne les rendait illisibles */}
        <h3 className="text-sm leading-snug text-[#241A14] line-clamp-2 min-h-[2.5rem] group-hover:text-[#C2410C] transition-colors">
          {name}
        </h3>

        {summary && <p className="text-xs text-[#7D6A5D] truncate mt-1">{summary}</p>}

        {!!review_count && avg_rating != null && (
          <div className="mt-1.5">
            <StarRating rating={avg_rating} reviewCount={review_count} size={12} />
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          <span className="text-base font-bold text-[#241A14] tabular-nums">
            {price_fcfa.toLocaleString('fr-CI')} FCFA
          </span>
          {hasPromo && (
            <span className="text-xs text-[#7D6A5D] line-through tabular-nums">
              {compare_at_price_fcfa!.toLocaleString('fr-CI')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
