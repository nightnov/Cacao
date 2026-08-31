'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { OptionValue } from '@/lib/options'

/**
 * Section « Description », repliable, placée sous la partie achat.
 *
 * Elle remplace le gros bloc « Caractéristiques » qui occupait le haut de la
 * fiche : les sélecteurs de configuration montrent déjà le processeur, la
 * mémoire et le stockage retenus, et les répéter juste à côté disait deux fois
 * la même chose.
 *
 * Les blocs suivent la configuration CHOISIE. Sélectionner 16 Go affiche
 * l'explication propre à 16 Go, pas un texte générique sur la mémoire.
 */
export function ProductDescription({
  description,
  blocks,
}: {
  description?: string | null
  /** Valeurs retenues qui portent un bloc explicatif renseigné. */
  blocks: OptionValue[]
}) {
  const [open, setOpen] = useState(true)

  const usableBlocks = blocks.filter(b => b.block_title || b.block_body || b.block_image_url)
  const hasText = !!description?.trim()

  // Ni texte général ni bloc : la section n'a rien à montrer et disparaît
  // plutôt que d'afficher un titre repliable vide.
  if (!hasText && usableBlocks.length === 0) return null

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
              {description}
            </p>
          )}

          {usableBlocks.length > 0 && (
            <div className={`grid gap-4 sm:grid-cols-2 ${hasText ? 'mt-6' : ''}`}>
              {usableBlocks.map(block => (
                <article
                  key={block.id}
                  className="rounded-lg border border-border bg-bg-raised overflow-hidden"
                >
                  {block.block_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={block.block_image_url}
                      alt=""
                      className="w-full h-36 object-contain bg-bg-sunken p-3"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-display text-[14px] text-ink mb-1.5">
                      {block.block_title || block.label}
                    </h3>
                    {block.block_body && (
                      <p className="text-[13px] text-ink-dim leading-[1.6] whitespace-pre-wrap">
                        {block.block_body}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
