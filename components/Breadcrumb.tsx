import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  /** Absent sur le dernier maillon : on ne fait pas un lien vers la page en cours. */
  href?: string
}

/**
 * Fil d'orientation « Accueil › Catalogue › rayon ».
 *
 * Il existait en double, écrit à la main sur le catalogue et sur la fiche
 * produit, avec des séparateurs et des espacements différents. Un seul
 * composant garantit qu'ils se ressemblent.
 *
 * Le dernier maillon est rendu en `<span>` et porte `aria-current="page"` :
 * un lecteur d'écran annonce ainsi la position sans proposer un lien qui
 * rechargerait la page déjà affichée.
 */
export function Breadcrumb({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12px] text-ink-dimmer">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && (
                /* Chevron fin plutôt qu'une barre oblique : plus discret, et il
                   indique un sens de lecture. `border-strong` le pose sous le
                   niveau des libellés pour qu'il ne ponctue pas la ligne. */
                <ChevronRight
                  size={13}
                  strokeWidth={1.75}
                  className="text-border-strong flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span className="text-ink" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-ink transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
