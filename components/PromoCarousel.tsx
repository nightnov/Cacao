'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PromoSlide } from '@/lib/hero'

/**
 * Bandeau promotionnel de l'accueil.
 *
 * La zone ne montre que des images publiées depuis l'administration. Rien n'y
 * est ajouté automatiquement : ni badge, ni nom de produit, ni prix, ni dégradé.
 * Ce qui s'affiche est ce qui a été choisi, et le reste de l'espace demeure
 * calme — c'est ce qui permet d'y poser un visuel de communication complet.
 *
 * `object-contain` et non `cover` : une bannière est composée avec son texte
 * dans l'image, et un recadrage automatique lui couperait ses propres mots.
 */
/**
 * Flèche de navigation. Posée sur l'image, elle doit rester lisible quel que
 * soit le visuel dessous : d'où le fond opaque flouté plutôt qu'une icône nue.
 */
const arrowCls = (side: string) =>
  `absolute ${side} top-1/2 -translate-y-1/2 z-10 grid place-items-center ` +
  'h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border ' +
  'bg-bg-panel/85 backdrop-blur-sm text-ink shadow-sm ' +
  'hover:bg-bg-panel transition-colors'

export function PromoCarousel({
  slides,
  intervalMs,
  className = '',
  bleed = false,
}: {
  slides: PromoSlide[]
  intervalMs: number
  className?: string
  /** Pleine largeur : ni cadre ni coins arrondis, la bannière touche les bords. */
  bleed?: boolean
}) {
  const [index, setIndex] = useState(0)
  // Le défilement s'interrompt au survol et au focus clavier : une image qui
  // change pendant qu'on vise son lien fait cliquer sur la mauvaise.
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const count = slides.length

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count])

  useEffect(() => {
    // Au-delà de l'index disponible après une suppression, on revient au début.
    if (index >= count) setIndex(0)
  }, [count, index])

  // Respecte le réglage système « réduire les animations » : pour qui souffre
  // de troubles vestibulaires, un défilement non sollicité est un symptôme.
  // Mesuré dans un état plutôt qu'à la volée, car la jauge de temps restant
  // doit disparaître exactement quand le défilement s'arrête.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    setReducedMotion(query.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const autoPlaying = count > 1 && !paused && !reducedMotion

  useEffect(() => {
    if (!autoPlaying) return
    timer.current = setInterval(() => setIndex(i => (i + 1) % count), intervalMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [autoPlaying, count, intervalMs])

  if (count === 0) return null

  const current = slides[Math.min(index, count - 1)]

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.image_url}
      alt={current.alt_text || ''}
      /* Recadrée sur téléphone, entière au delà.
         Une bannière au format 2000 sur 700 ramenée à 375 px de large ne fait
         plus que 131 px de haut : lisible pour personne. La montrer entière
         imposait donc une zone très haute, et la page commençait par un grand
         vide au dessus et au dessous de l'image.
         `cover` prend la partie centrale et remplit la hauteur. C'est un
         compromis assumé : ce qui touche les bords gauche et droit sort du
         cadre, d'où la consigne de centrer texte et logo, rappelée dans
         l'écran d'administration. */
      className="w-full h-full object-cover md:object-contain"
    />
  )

  return (
    <div
      /* Le cadre et les coins arrondis sont retirés en pleine largeur : une
         bannière bordée qui touche les deux bords de l'écran montre ses
         angles coupés dans le vide. */
      className={`relative overflow-hidden bg-bg-panel ${
        bleed ? '' : 'rounded-xl border border-border'
      } ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      /* Annonce les changements sans interrompre la lecture en cours. */
      aria-roledescription="carrousel"
      aria-live="polite"
    >
      {current.link_url ? (
        <Link href={current.link_url} className="block w-full h-full">
          {image}
        </Link>
      ) : (
        image
      )}

      {count > 1 && (
        <>
          {/* Flèches précédente / suivante. Les pastilles seules obligent à
              viser une cible de 6 px : la flèche est la commande évidente,
              la pastille indique où l'on en est. */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Image précédente"
            className={arrowCls('left-3 sm:left-4')}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Image suivante"
            className={arrowCls('right-3 sm:right-4')}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>

          {/* Pastilles de navigation. Sans elles, rien n'indique qu'il existe
              d'autres images. */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Afficher l'image ${i + 1} sur ${count}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-ink' : 'w-1.5 bg-ink/40 hover:bg-ink/70'
                }`}
              />
            ))}
          </div>

          {/* Jauge du temps restant avant l'image suivante. Elle rend visible
              un compte à rebours qui, sans elle, ne se manifeste que par un
              changement soudain. La clé `index` relance l'animation à chaque
              image ; elle se fige au survol, en même temps que le défilement. */}
          {autoPlaying && (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/10">
              <div
                key={index}
                className="h-full bg-accent origin-left animate-[promo-progress_linear_forwards]"
                style={{ animationDuration: `${intervalMs}ms` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
