'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
export function PromoCarousel({
  slides,
  intervalMs,
  className = '',
}: {
  slides: PromoSlide[]
  intervalMs: number
  className?: string
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

  useEffect(() => {
    if (count <= 1 || paused) return

    // Respecte le réglage système « réduire les animations » : pour qui souffre
    // de troubles vestibulaires, un défilement non sollicité est un symptôme.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    timer.current = setInterval(() => setIndex(i => (i + 1) % count), intervalMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [count, intervalMs, paused])

  if (count === 0) return null

  const current = slides[Math.min(index, count - 1)]

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.image_url}
      alt={current.alt_text || ''}
      className="w-full h-full object-contain"
    />
  )

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-bg-panel ${className}`}
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
        /* Pastilles de navigation. Elles restent le seul ornement de la zone :
           sans elles, rien n'indique qu'il existe d'autres images. */
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
      )}
    </div>
  )
}
