'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'
import { StarRating } from '@/components/StarRating'
import { formatAmount } from '@/lib/format'
import { colorToHex } from '@/lib/colorNames'

interface ColorVariant {
  value: string
  image_url: string | null
}

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
  colors?: ColorVariant[]
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
  specs,
  colors = []
}: ProductCardProps) {
  const hasPromo = !!compare_at_price_fcfa && compare_at_price_fcfa > price_fcfa
  const discount = hasPromo
    ? Math.round(((compare_at_price_fcfa! - price_fcfa) / compare_at_price_fcfa!) * 100)
    : 0
  const isNew = !!created_at && Date.now() - new Date(created_at).getTime() < NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  const summary = specsSummary(specs)

  // Couleur choisie sur la carte : ne change QUE la photo affichée ici,
  // sans naviguer. Le vrai choix (avec effet sur le prix) se fait sur la
  // fiche produit, où les variantes existent réellement.
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null)
  const displayImage = selectedColor?.image_url || image_urls?.[0]

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col bg-bg-panel border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-border-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="relative h-[132px] sm:h-[158px] bg-bg-sunken flex items-center justify-center overflow-hidden flex-shrink-0">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
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
          <span className="absolute top-2.5 left-2.5 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-white bg-green tabular-nums tracking-wide">
            -{discount}%
          </span>
        ) : isNew ? (
          <span className="absolute top-2.5 left-2.5 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-ink-invert bg-gold tracking-wide">
            NOUVEAU
          </span>
        ) : null}

        <FavoriteButton
          productId={id}
          size={14}
          className="absolute top-2 right-2 w-7 h-7 bg-black/45 border border-border-strong text-ink-dim"
        />
      </div>

      <div className="flex flex-col flex-1 px-5 pt-4 pb-5">
        {/* Nom en display : les références PC sont longues, deux lignes maximum */}
        <h3 className="font-display text-[16px] text-ink line-clamp-2 min-h-[2.6rem] leading-[1.25] group-hover:text-gold transition-colors">
          {name}
        </h3>

        {summary && (
          <p className="text-[12px] text-ink-dimmer leading-[1.55] mt-2 line-clamp-2">{summary}</p>
        )}

        {!!review_count && avg_rating != null && (
          <div className="mt-2">
            <StarRating rating={avg_rating} reviewCount={review_count} size={11} compact />
          </div>
        )}

        {/* Pastilles de couleur : aperçu rapide sans quitter la grille.
            Le vrai choix (et son effet sur le prix) se fait sur la fiche
            produit, où les variantes ont un prix réel. */}
        {colors.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2.5" onClick={e => e.preventDefault()}>
            {colors.slice(0, 5).map(c => {
              const hex = colorToHex(c.value)
              const active = selectedColor?.value === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.value}
                  aria-label={`Voir en ${c.value}`}
                  aria-pressed={active}
                  onClick={() => setSelectedColor(active ? null : c)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-transform ${
                    active ? 'border-gold scale-110' : 'border-border hover:border-border-strong'
                  }`}
                  style={{ backgroundColor: hex || '#45484C' }}
                />
              )
            })}
          </div>
        )}

        <div className="mt-auto pt-2.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-[21px] text-ink tabular-nums leading-tight">
            {formatAmount(price_fcfa)} FCFA
          </span>
          {hasPromo && (
            <span className="text-[12.5px] text-ink-faint line-through tabular-nums">
              {formatAmount(compare_at_price_fcfa!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
