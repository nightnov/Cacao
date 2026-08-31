'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { OptionValue, ProductOption } from '@/lib/options'
import { stripDashes } from '@/lib/text'

/**
 * Section « Description », repliable, placée sous la partie achat.
 *
 * Elle remplace le bloc « Caractéristiques » qui occupait le haut de la fiche :
 * les sélecteurs montrent déjà le processeur, la mémoire et le stockage
 * retenus, et les répéter juste à côté disait deux fois la même chose.
 *
 * Les explications suivent la configuration CHOISIE. Sélectionner 16 Go affiche
 * ce que permettent 16 Go, pas un texte général sur la mémoire. Chaque élément
 * retenu a son onglet, et des flèches permettent de passer de l'un à l'autre
 * sans viser un petit libellé au doigt.
 */
export function ProductDescription({
  description,
  options,
  blocks,
}: {
  description?: string | null
  /** Options du produit, pour nommer chaque explication par son groupe. */
  options: ProductOption[]
  /** Valeurs retenues, dans l'ordre d'affichage. */
  blocks: OptionValue[]
}) {
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState(0)

  const optionName = useMemo(() => {
    const map = new Map(options.map(o => [o.id, o.name]))
    return (value: OptionValue) => map.get(value.option_id) || ''
  }, [options])

  // Seules les valeurs qui ont réellement quelque chose à dire deviennent des
  // onglets : un onglet menant à un cadre vide est pire que pas d'onglet.
  const usable = useMemo(
    () => blocks.filter(b => b.block_title || b.block_body || b.block_image_url),
    [blocks]
  )

  const ordered = useMemo(
    () =>
      [...usable].sort(
        (a, b) => (a.block_sort_order ?? a.sort_order) - (b.block_sort_order ?? b.sort_order)
      ),
    [usable]
  )

  // Changer de configuration peut réduire le nombre d'explications : sans ce
  // recalage, l'onglet actif pointerait dans le vide.
  useEffect(() => {
    if (active >= ordered.length) setActive(0)
  }, [active, ordered.length])

  const hasText = !!description?.trim()

  // Ni texte général ni explication : la section n'a rien à montrer et
  // disparaît plutôt que d'afficher un titre repliable vide.
  if (!hasText && ordered.length === 0) return null

  const current = ordered[Math.min(active, ordered.length - 1)]
  const go = (delta: number) =>
    setActive(i => (i + delta + ordered.length) % ordered.length)

  return (
    <section className="rounded-xl border border-border bg-bg-panel overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
        >
          <span className="font-display text-[16px] text-ink">DESCRIPTION</span>
          <ChevronDown
            size={18}
            className={`text-ink-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h2>

      {open && (
        <div className="px-5 sm:px-6 pb-6 border-t border-border pt-5">
          {hasText && (
            /* `whitespace-pre-wrap` : les descriptions sont saisies avec des
               retours à la ligne en administration, et les perdre transformait
               un texte aéré en un seul pavé. */
            <p className="text-[14px] text-ink-dim leading-[1.7] whitespace-pre-wrap">
              {stripDashes(description)}
            </p>
          )}

          {ordered.length > 0 && (
            <div className={hasText ? 'mt-6' : ''}>
              <div className="flex items-center gap-2 mb-4">
                {/* Onglets défilables : quatre composants tiennent rarement sur
                    une ligne de téléphone. */}
                <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar">
                  {ordered.map((block, i) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-current={i === active}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-lg border text-[12.5px] font-semibold transition-colors ${
                        i === active
                          ? 'border-accent bg-accent/10 text-ink'
                          : 'border-border-mid bg-bg-raised text-ink-dim hover:border-border-strong hover:text-ink'
                      }`}
                    >
                      {block.label}
                    </button>
                  ))}
                </div>

                {/* Flèches : utiles au doigt, et elles n'apparaissent que s'il y
                    a réellement plusieurs explications à parcourir. */}
                {ordered.length > 1 && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label="Explication précédente"
                      className="w-8 h-8 rounded-lg border border-border-mid text-ink-dim hover:text-ink hover:border-border-strong flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label="Explication suivante"
                      className="w-8 h-8 rounded-lg border border-border-mid text-ink-dim hover:text-ink hover:border-border-strong flex items-center justify-center transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              {current && (
                <article className="rounded-lg border border-border bg-bg-raised overflow-hidden grid grid-cols-1 sm:grid-cols-[240px,1fr]">
                  {current.block_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.block_image_url}
                      alt=""
                      className="w-full h-44 sm:h-full object-contain bg-bg-sunken p-4"
                    />
                  ) : null}
                  <div className="p-5">
                    <p className="text-[11px] font-semibold tracking-[0.4px] text-ink-dimmer uppercase mb-1">
                      {optionName(current)}
                    </p>
                    <h3 className="font-display text-[16px] text-ink mb-2">
                      {stripDashes(current.block_title) || current.label}
                    </h3>
                    {current.block_body ? (
                      <p className="text-[13.5px] text-ink-dim leading-[1.7] whitespace-pre-wrap">
                        {stripDashes(current.block_body)}
                      </p>
                    ) : (
                      <p className="text-[13px] text-ink-dimmer">
                        Aucune explication renseignée pour cette option.
                      </p>
                    )}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
