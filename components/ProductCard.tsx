'use client'

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

  // Une seule photo sur la carte. Le choix de la couleur appartient à la fiche
  // produit, où la variante a un prix réel : le proposer ici laissait croire à
  // une sélection alors que rien n'était retenu au passage au panier.
  const displayImage = image_urls?.[0]

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col bg-bg-panel border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-border-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {/* Cadre carré plutôt qu'une hauteur fixe : à 387 px de large, une bande
          de 158 px écrasait la machine sur une fine ligne. Le carré suit la
          largeur de la colonne et garde la même proportion à toutes les
          tailles d'écran. */}
      <div className="relative aspect-square bg-bg-sunken flex items-center justify-center overflow-hidden flex-shrink-0">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(var(--c-border-mid))"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        {/* Un seul badge : la remise chiffrée prime sur la nouveauté.
            Même retrait que le bouton favori en vis-à-vis, pour que les deux
            coins restent alignés d'une carte à l'autre. */}
        {hasPromo ? (
          <span className="absolute top-2.5 left-2.5 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-ink-invert bg-green-bright tabular-nums tracking-wide">
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
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/45 border border-border-strong text-ink-dim"
        />
      </div>

      {/* Chaque zone occupe la même hauteur d'une carte à l'autre : nom sur
          deux lignes réservées, ligne de caractéristiques conservée même vide,
          prix collé en bas. Sans ces hauteurs fixes, un produit sans
          caractéristiques remontait son prix et la rangée perdait son
          alignement. */}
      <div className="flex flex-col flex-1 px-5 pt-4 pb-5">
        {/* Nom en display : les références PC sont longues, deux lignes maximum */}
        <h3 className="font-display text-[17px] text-ink line-clamp-2 min-h-[2.65rem] leading-[1.25] group-hover:text-gold transition-colors">
          {name}
        </h3>

        <p className="text-[12.5px] text-ink-dimmer leading-[1.45] mt-1.5 line-clamp-2 min-h-[36px]">
          {summary}
        </p>

        {!!review_count && avg_rating != null && (
          <div className="mt-1.5">
            <StarRating rating={avg_rating} reviewCount={review_count} size={12} compact />
          </div>
        )}

        <div className="mt-auto pt-3 flex items-baseline gap-2.5 flex-wrap">
          <span className="font-display text-[22px] text-ink tabular-nums leading-tight">
            {formatAmount(price_fcfa)} FCFA
          </span>
          {hasPromo && (
            <span className="text-[13.5px] text-ink-faint line-through tabular-nums">
              {formatAmount(compare_at_price_fcfa!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
