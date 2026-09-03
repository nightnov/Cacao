'use client'

import React from 'react'
import { formatAmount } from '@/lib/format'
import {
  baseValues,
  configuredPrice,
  defaultSelection,
  differsFromBase,
  selectedValues,
  type ProductOption,
  type Selection,
} from '@/lib/options'

/**
 * Deux résumés côte à côte : la configuration de base et celle du client.
 *
 * Sans le point de départ, un client qui découvre un prix plus élevé que celui
 * du catalogue ne sait pas d'où vient l'écart. Montrer les deux rend le
 * supplément compréhensible plutôt que suspect.
 *
 * Les deux blocs restent affichés en permanence, y compris à l'ouverture de la
 * fiche où ils disent la même chose. Masquer le second tant que rien n'avait
 * bougé faisait apparaître un encadré au premier clic, et surtout ne montrait
 * jamais au client qu'il existe une configuration modifiable.
 */
export function ConfigSummary({
  options,
  selection,
  basePrice,
}: {
  options: ProductOption[]
  selection: Selection
  basePrice: number
}) {
  if (options.length === 0) return null

  const base = baseValues(options)
  const chosen = selectedValues(options, selection)
  const startPrice = configuredPrice(basePrice, options, defaultSelection(options))
  const currentPrice = configuredPrice(basePrice, options, selection)
  const changed = differsFromBase(options, selection)
  const gap = currentPrice - startPrice

  const line = (values: typeof base) => values.map(v => v.label).join(', ')

  return (
    <div className="rounded-lg border border-border bg-bg-raised divide-y divide-border">
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.4px] text-ink-dimmer uppercase mb-1">
          Configuration de base
        </p>
        <p className="text-[13px] text-ink-dim leading-[1.5]">{line(base)}</p>
        <p className="text-[12.5px] text-ink-dimmer mt-1 tabular-nums">
          Prix de départ : {formatAmount(startPrice)} FCFA
        </p>
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.4px] text-accent uppercase mb-1">
          Configuration sélectionnée
        </p>
        <p className="text-[13px] text-ink leading-[1.5]">{line(chosen)}</p>
        <p className="text-[12.5px] mt-1 tabular-nums text-ink-dim">
          {!changed ? (
            'Identique à la configuration de base'
          ) : gap === 0 ? (
            'Sans changement de prix'
          ) : (
            <>
              {gap > 0 ? 'Supplément' : 'Réduction'} de{' '}
              <span className="text-accent font-semibold">
                {formatAmount(Math.abs(gap))} FCFA
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
