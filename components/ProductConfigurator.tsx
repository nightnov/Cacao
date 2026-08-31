'use client'

import React from 'react'
import { formatAmount } from '@/lib/format'
import { activeValues, type ProductOption } from '@/lib/options'

/**
 * Sélecteurs de configuration : Couleur, Stockage, RAM, Processeur…
 *
 * Chaque valeur affiche l'écart de prix qu'elle entraîne, signé. Une option
 * qui coûte plus cher sans le dire fait découvrir l'écart au moment de payer,
 * ce qui est le meilleur moyen de faire abandonner un panier.
 *
 * La valeur retenue est cernée par la couleur d'accent : c'est le seul endroit
 * de la fiche où elle sert de contour, précisément pour qu'on la remarque.
 */
export function ProductConfigurator({
  options,
  selection,
  onSelect,
}: {
  options: ProductOption[]
  selection: Record<string, string>
  onSelect: (optionId: string, valueId: string) => void
}) {
  // Aucune option configurée : on n'affiche pas un titre suivi du vide.
  if (options.length === 0) return null

  return (
    <div className="space-y-5">
      {options.map(option => {
        const values = activeValues(option)
        if (values.length === 0) return null

        const chosen = values.find(v => v.id === selection[option.id])

        return (
          <div key={option.id}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="font-display text-[12.5px] tracking-[0.5px] text-ink uppercase">
                {option.name}
              </p>
              {chosen && (
                <p className="text-[12.5px] text-ink-dim truncate">{chosen.label}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = selection[option.id] === value.id
                const delta = Number(value.price_delta_fcfa) || 0

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => onSelect(option.id, value.id)}
                    aria-pressed={isSelected}
                    className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-border-mid bg-bg-raised text-ink-dim hover:border-border-strong hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {/* Pastille de couleur quand la valeur porte une image :
                          elle donne un aperçu sans quitter le sélecteur. */}
                      {value.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={value.image_url}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-[13px] font-semibold">{value.label}</span>
                    </span>

                    {/* L'écart n'est montré que s'il existe : « +0 FCFA » sur la
                        valeur de base ajouterait du bruit sans rien apprendre. */}
                    {delta !== 0 && (
                      <span
                        className={`block text-[11.5px] mt-0.5 tabular-nums ${
                          isSelected ? 'text-accent' : 'text-ink-dimmer'
                        }`}
                      >
                        {delta > 0 ? '+' : '−'}
                        {formatAmount(Math.abs(delta))} FCFA
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {chosen?.description && (
              <p className="text-[12.5px] text-ink-dim mt-2 leading-[1.5]">{chosen.description}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
