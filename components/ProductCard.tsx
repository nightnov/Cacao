'use client'

import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'
import { StarRating } from '@/components/StarRating'
import { formatAmount } from '@/lib/format'
import { PRICE, PRICE_OLD, categoryAccent } from '@/lib/ui'

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
}

const NEW_THRESHOLD_DAYS = 14

/**
 * Carte produit des grilles : accueil, catalogue, « vous aimerez aussi ».
 *
 * Un seul cadre, et un dégradé diagonal très doux du fond des cartes vers le
 * fond de la page. Un aplat parfaitement uniforme paraît plat sur une grande
 * surface ; ce léger glissement suffit à donner du corps sans qu'on le voie.
 *
 * La zone image n'a en revanche aucun fond propre : les photos étant des PNG
 * détourés, le fond de la carte doit passer derrière le produit. Lui donner sa
 * propre teinte créait une bande visible qui coupait la carte en deux.
 *
 * Aucune caractéristique technique ici. Processeur, mémoire et stockage
 * appartiennent à la fiche produit : les répéter dans la grille éloignait le
 * nom de son prix, alors que les deux se lisent ensemble.
 */
export function ProductCard({
  id,
  name,
  slug,
  price_fcfa,
  compare_at_price_fcfa,
  category,
  image_urls,
  created_at,
  avg_rating,
  review_count,
}: ProductCardProps) {
  const hasPromo = !!compare_at_price_fcfa && compare_at_price_fcfa > price_fcfa
  const discount = hasPromo
    ? Math.round(((compare_at_price_fcfa! - price_fcfa) / compare_at_price_fcfa!) * 100)
    : 0
  const isNew =
    !!created_at &&
    Date.now() - new Date(created_at).getTime() < NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  // Une seule photo sur la carte. Le choix de la couleur appartient à la fiche
  // produit, où la variante a un prix réel : le proposer ici laissait croire à
  // une sélection alors que rien n'était retenu au passage au panier.
  const displayImage = image_urls?.[0]

  // Teinte du rayon : elle ne sert qu'à la bordure du survol. Un rayon inconnu
  // retombe sur la couleur commerciale plutôt que de n'avoir aucune teinte.
  const accent = categoryAccent(category)

  return (
    <Link
      href={`/products/${slug}`}
      /* Au survol : très léger soulèvement, ombre douce et bordure teintée par
         le rayon. La couleur ne fait qu'affleurer — un contour franchement
         lumineux attirerait l'œil sur le cadre plutôt que sur la machine. */
      className={`group flex flex-col bg-gradient-to-br from-bg-panel to-bg border border-border rounded-xl overflow-hidden shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${accent.border} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
    >
      {/* Hauteur fixe plutôt que proportionnelle : toutes les images occupent
          la même place quelle que soit la largeur de la colonne, et la carte
          ne devient pas démesurée sur grand écran. */}
      <div className="relative aspect-square min-h-0 overflow-hidden flex items-center justify-center flex-shrink-0">
        {/* Halo sombre très diffus derrière l'image. Un PNG détouré posé à plat
            sur un aplat uniforme paraît collé ; ce dégradé lui donne un sol.
            `pointer-events-none` : il ne doit jamais intercepter le clic. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,rgb(var(--c-bg-raised)/0.55),transparent_70%)]"
        />

        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={name}
            loading="lazy"
            /* `contain` et non `cover` : un PNG détouré recadré perdrait
               justement ce qu'on cherche à montrer. */
            className="relative w-full h-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
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

        {/* Un seul badge, la remise primant sur la nouveauté. Même retrait que
            le bouton favori en vis-à-vis, pour que les deux coins restent
            alignés d'une carte à l'autre.

            La remise est la seule vraie promotion : elle porte la couleur
            promotionnelle. « Nouveau » est une information, pas une offre — il
            reste neutre, sans quoi la couleur d'alerte perdrait son sens. */}
        {hasPromo ? (
          <span className="absolute top-2.5 left-2.5 z-10 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-ink-invert bg-gold tabular-nums tracking-wide">
            -{discount}%
          </span>
        ) : isNew ? (
          <span className="absolute top-2.5 left-2.5 z-10 text-[9.5px] font-extrabold px-2 py-[3px] rounded text-ink-invert bg-ink tracking-wide">
            NOUVEAU
          </span>
        ) : null}

        <FavoriteButton
          productId={id}
          size={14}
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/45 border border-border-strong text-ink-dim"
        />
      </div>

      {/* Nom et prix forment un seul groupe, sans rien entre eux. La hauteur
          du nom est réservée sur deux lignes : les références PC sont longues,
          et sans cette réserve les prix se décalaient d'une carte à l'autre. */}
      <div className="p-4">
        <h3 className="font-display font-medium text-[20px] text-ink line-clamp-2 min-h-[3.125rem] leading-[1.25] group-hover:text-ink-dim transition-colors">
          {name}
        </h3>

        {/* Le prix réel porte la couleur commerciale ; le prix barré reste gris
            et plus petit. Les mettre tous deux en couleur donnerait le même
            poids à un montant qu'on ne paie pas. Écart resserré à `gap-2` pour
            qu'ils se lisent comme un seul bloc. */}
        <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
          <span className={`${PRICE} text-[20px] sm:text-[24px]`}>
            {formatAmount(price_fcfa)} FCFA
          </span>
          {hasPromo && (
            <span className={`${PRICE_OLD} text-[14px]`}>
              {formatAmount(compare_at_price_fcfa!)}
            </span>
          )}
        </div>

        {/* Sous le prix, pour ne pas séparer le nom de son montant. */}
        {!!review_count && avg_rating != null && (
          <div className="mt-2">
            <StarRating rating={avg_rating} reviewCount={review_count} size={12} compact />
          </div>
        )}
      </div>
    </Link>
  )
}
