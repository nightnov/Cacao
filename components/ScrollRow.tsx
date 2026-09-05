'use client'

import { useEffect, useRef, useState } from 'react'
import { SCROLL_ROW } from '@/lib/ui'

/**
 * Rangée de cartes qui glisse au doigt, avec ses points de position.
 *
 * Les points ne sont pas décoratifs : ils disent combien de cartes existent et
 * laquelle on regarde. Sans eux, une rangée dont la suivante affleure à peine
 * ressemble à une carte mal cadrée plutôt qu'à une série. Ils disparaissent
 * dès la tablette, où la grille montre tout d'un coup et où il n'y a donc plus
 * de position à indiquer.
 *
 * La position se lit sur le défilement réel plutôt que d'être commandée par
 * des flèches : le doigt reste maître, et l'indicateur suit au lieu de
 * prétendre diriger.
 */
export function ScrollRow({
  children,
  count,
  className = '',
}: {
  children: React.ReactNode
  count: number
  className?: string
}) {
  const piste = useRef<HTMLDivElement>(null)
  const [actif, setActif] = useState(0)

  useEffect(() => {
    const el = piste.current
    if (!el) return

    const suivre = () => {
      // Une carte plus son écart. On déduit le pas de la largeur réelle du
      // premier enfant : le coder en dur obligerait à le corriger à chaque
      // ajustement de la carte, et il finirait par mentir.
      const premier = el.firstElementChild as HTMLElement | null
      if (!premier) return
      const pas = premier.offsetWidth + 16
      setActif(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / pas))))
    }

    el.addEventListener('scroll', suivre, { passive: true })
    return () => el.removeEventListener('scroll', suivre)
  }, [count])

  return (
    <>
      <div ref={piste} className={`${SCROLL_ROW} ${className}`}>
        {children}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-4 sm:hidden" aria-hidden="true">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              /* La pastille active s'allonge au lieu de seulement changer de
                 teinte : sur un écran lumineux en plein jour, une différence de
                 couleur seule ne se voit pas. */
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === actif ? 'w-6 bg-accent' : 'w-1.5 bg-border-strong'
              }`}
            />
          ))}
        </div>
      )}
    </>
  )
}
