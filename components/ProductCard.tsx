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

const availabilityLabel: Record<ProductCardProps['availability'], { text: string; tone: string }> = {
  in_stock: { text: 'En stock, livrable', tone: 'text-[#1E7A46]' },
  on_order: { text: 'Sur commande', tone: 'text-[#7D6A5D]' },
  discontinued: { text: 'Indisponible', tone: 'text-[#9E8C7E]' }
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
  const avail = availabilityLabel[availability] ?? availabilityLabel.in_stock

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col bg-white border border-[#E8E0D8] rounded-xl overflow-hidden transition-all duration-200 hover:border-[#C9B8A8] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2"
    >
      {/* Visuel */}
      <div className="relative h-[132px] sm:h-[150px] bg-[#FAF7F4] flex items-center justify-center overflow-hidden flex-shrink-0">
        {image_urls && image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_urls[0]}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.2" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        {/* Un seul badge : la remise chiffrée prime sur la nouveauté */}
        {hasPromo ? (
          <span className="absolute top-2 left-2 text-[10px] font-extrabold px-1.5 py-[3px] rounded-md text-white bg-[#1E7A46] tabular-nums">
            -{discount}%
          </span>
        ) : isNew ? (
          <span className="absolute top-2 left-2 text-[10px] font-extrabold px-1.5 py-[3px] rounded-md text-white bg-[#C2410C]">
            Nouveau
          </span>
        ) : null}

        <FavoriteButton
          productId={id}
          size={13}
          className="absolute top-1.5 right-1.5 w-[26px] h-[26px] bg-white border border-[#E8E0D8]"
        />
      </div>

      {/* Informations */}
      <div className="flex flex-col flex-1 px-2.5 pt-2.5 pb-3">
        {/* Deux lignes : les références PC dépassent 100 caractères, une
            troncature sur une seule ligne les rendait illisibles. */}
        <h3 className="text-[12px] leading-[1.35] text-[#241A14] line-clamp-2 min-h-[2.05rem] group-hover:text-[#C2410C] transition-colors">
          {name}
        </h3>

        {summary && <p className="text-[10.5px] text-[#7D6A5D] truncate mt-1">{summary}</p>}

        {!!review_count && avg_rating != null && (
          <div className="mt-1.5">
            <StarRating rating={avg_rating} reviewCount={review_count} size={11} compact />
          </div>
        )}

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[15.5px] font-extrabold text-[#241A14] tabular-nums leading-tight">
              {formatAmount(price_fcfa)} FCFA
            </span>
            {hasPromo && (
              <span className="text-[11px] text-[#9E8C7E] line-through tabular-nums">
                {formatAmount(compare_at_price_fcfa!)}
              </span>
            )}
          </div>

          {/* Disponibilité réelle du produit, pas un délai inventé */}
          <p className={`text-[10px] font-bold mt-1 ${avail.tone}`}>{avail.text}</p>
        </div>
      </div>
    </Link>
  )
}
