'use client'

import React, { useEffect, useState } from 'react'
import {
  BatteryMedium,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  MonitorPlay,
  LayoutGrid,
  Usb,
  type LucideIcon,
} from 'lucide-react'
import type { DescriptionBlock } from '@/lib/glossary'
import { stripDashes } from '@/lib/text'

/**
 * Section « Description », repliable, placée sous la partie achat.
 *
 * Ce n'est pas la fiche commerciale du produit : c'est l'explication de ses
 * pièces pour quelqu'un qui ne sait pas ce qu'est une mémoire vive. Le texte
 * saisi en administration n'apparaît plus ici — il redisait en un pavé ce que
 * les caractéristiques donnent déjà en tableau.
 *
 * Chaque pièce a son onglet, à gauche sur grand écran pour qu'on voie d'un coup
 * d'œil tout ce qu'on peut consulter, et des flèches permettent de passer de
 * l'une à l'autre sans viser un petit libellé au doigt.
 */

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  ram: MemoryStick,
  storage: HardDrive,
  screen: Monitor,
  gpu: MonitorPlay,
  battery: BatteryMedium,
  os: LayoutGrid,
  ports: Usb,
}

export function ProductDescription({ blocks }: { blocks: DescriptionBlock[] }) {
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState(0)

  // Changer de configuration peut réduire le nombre d'explications : sans ce
  // recalage, l'onglet actif pointerait dans le vide.
  useEffect(() => {
    if (active >= blocks.length) setActive(0)
  }, [active, blocks.length])

  if (blocks.length === 0) return null

  const current = blocks[Math.min(active, blocks.length - 1)]
  const go = (delta: number) => setActive(i => (i + delta + blocks.length) % blocks.length)
  const Icon = ICONS[current.icon] || Cpu

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
        <div className="border-t border-border p-5 sm:p-6 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-5">
          {/* Colonne de navigation. Verticale sur grand écran : les quatre
              pièces se lisent alors comme un sommaire. Sur téléphone elle
              redevient une rangée qui défile, faute de largeur. */}
          <nav
            aria-label="Composants expliqués"
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar"
          >
            {blocks.map((block, i) => {
              const BlockIcon = ICONS[block.icon] || Cpu
              const isActive = i === active
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={isActive}
                  className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                    isActive
                      ? 'border-accent bg-accent/10'
                      : 'border-border-mid bg-bg-raised hover:border-border-strong'
                  }`}
                >
                  <BlockIcon
                    size={17}
                    strokeWidth={1.7}
                    className={isActive ? 'text-accent' : 'text-ink-dimmer'}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-[12.5px] font-semibold leading-tight ${
                        isActive ? 'text-ink' : 'text-ink-dim'
                      }`}
                    >
                      {block.group}
                    </span>
                    {/* La valeur réelle sous le nom de la pièce : c'est elle qui
                        rattache l'explication à la machine qu'on regarde. */}
                    {block.value && (
                      <span className="block text-[11px] text-ink-dimmer leading-tight truncate">
                        {block.value}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </nav>

          <article className="rounded-lg border border-border bg-bg-raised overflow-hidden">
            <div className="flex items-start gap-4 p-5 border-b border-border">
              {current.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.imageUrl}
                  alt=""
                  className="w-20 h-20 object-contain bg-bg-sunken rounded-lg p-2 flex-shrink-0"
                />
              ) : (
                /* Pas de photo : un pictogramme du site plutôt qu'un cadre
                   vide, et surtout plutôt qu'une image empruntée ailleurs. */
                <span
                  aria-hidden="true"
                  className="w-20 h-20 rounded-lg bg-bg-sunken border border-border flex items-center justify-center flex-shrink-0"
                >
                  <Icon size={30} strokeWidth={1.4} className="text-accent" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.4px] text-ink-dimmer uppercase mb-1">
                  {current.group}
                </p>
                <h3 className="font-display text-[17px] text-ink leading-tight">
                  {stripDashes(current.title)}
                </h3>
                {current.value && (
                  <p className="text-[13px] text-accent font-medium mt-1">{current.value}</p>
                )}
              </div>
            </div>

            <div className="p-5">
              <p className="text-[13.5px] text-ink-dim leading-[1.75] whitespace-pre-wrap">
                {stripDashes(current.body)}
              </p>

              {blocks.length > 1 && (
                <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="flex items-center gap-1.5 text-[12.5px] text-ink-dim hover:text-ink transition-colors"
                  >
                    <ChevronLeft size={15} />
                    {blocks[(active - 1 + blocks.length) % blocks.length].group}
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="flex items-center gap-1.5 text-[12.5px] text-ink-dim hover:text-ink transition-colors"
                  >
                    {blocks[(active + 1) % blocks.length].group}
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  )
}
