'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { formatAmount } from '@/lib/format'
import { stripDashes } from '@/lib/text'
import {
  activeValues,
  optionMode,
  type ProductOption,
  type Selection,
} from '@/lib/options'

/**
 * Sélecteurs de configuration : Couleur, Stockage, RAM, Processeur…
 *
 * Chaque valeur affiche l'écart de prix qu'elle entraîne, signé. Une option qui
 * coûte plus cher sans le dire fait découvrir l'écart au moment de payer, ce
 * qui est le meilleur moyen de faire abandonner un panier.
 *
 * Le mode de sélection vient de l'administration. En choix unique, cliquer une
 * valeur remplace la précédente ; en choix multiple, les valeurs s'ajoutent et
 * leurs suppléments se cumulent. Seul le stockage a une raison d'être cumulé,
 * et encore, machine par machine.
 */
export function ProductConfigurator({
  options,
  selection,
  onToggle,
}: {
  options: ProductOption[]
  selection: Selection
  onToggle: (option: ProductOption, valueId: string) => void
}) {
  // Aucune option configurée : on n'affiche pas un titre suivi du vide.
  if (options.length === 0) return null

  return (
    <div className="space-y-5">
      {options.map(option => {
        const values = activeValues(option)
        if (values.length === 0) return null

        const chosenIds = selection[option.id] || []
        const multiple = optionMode(option) === 'multiple'
        const chosenLabels = values.filter(v => chosenIds.includes(v.id)).map(v => v.label)

        return (
          <div key={option.id}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="font-display text-[12.5px] tracking-[0.5px] text-ink uppercase">
                {option.name}
              </p>
              {chosenLabels.length > 0 && (
                <p className="text-[12.5px] text-ink-dim truncate">
                  {chosenLabels.join(', ')}
                </p>
              )}
            </div>

            {/* Le cumul est annoncé : sans cela, un client qui ajoute un second
                disque croit s'être trompé en voyant les deux rester allumés. */}
            {multiple && (
              <p className="text-[11.5px] text-ink-dimmer mb-2">
                Vous pouvez en cumuler plusieurs.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = chosenIds.includes(value.id)
                const delta = Number(value.price_delta_fcfa) || 0

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => onToggle(option, value.id)}
                    /* `aria-pressed` en choix multiple, `aria-checked` en choix
                       unique : un lecteur d'écran doit pouvoir distinguer un
                       cumul d'un choix exclusif. */
                    role={multiple ? undefined : 'radio'}
                    aria-checked={multiple ? undefined : isSelected}
                    aria-pressed={multiple ? isSelected : undefined}
                    className={`relative px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-border-mid bg-bg-raised text-ink-dim hover:border-border-strong hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {/* Aperçu quand la valeur porte une image : la couleur se
                          juge mieux qu'elle ne se lit. */}
                      {value.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={value.image_url}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-[13px] font-semibold">{value.label}</span>
                      {multiple && isSelected && (
                        <Check size={13} className="text-accent flex-shrink-0" aria-hidden="true" />
                      )}
                    </span>

                    {/* L'écart n'est montré que s'il existe : « +0 FCFA » sur la
                        valeur de base ajouterait du bruit sans rien apprendre. */}
                    {delta !== 0 && (
                      <span
                        className={`block text-[11.5px] mt-0.5 tabular-nums ${
                          isSelected ? 'text-accent' : 'text-ink-dimmer'
                        }`}
                      >
                        {/* Formulé en toutes lettres plutôt qu'avec un signe
                            moins : aucun tiret ne doit apparaître dans les
                            libellés vus par le client. */}
                        {delta > 0
                          ? `+${formatAmount(delta)} FCFA`
                          : `Réduction ${formatAmount(Math.abs(delta))} FCFA`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explication de la valeur retenue, quand une seule est choisie.
                En cumul, plusieurs phrases empilées alourdiraient le bloc. */}
            {chosenIds.length === 1 && (
              <>
                {values
                  .filter(v => v.id === chosenIds[0] && v.description)
                  .map(v => (
                    <p key={v.id} className="text-[12.5px] text-ink-dim mt-2 leading-[1.5]">
                      {stripDashes(v.description)}
                    </p>
                  ))}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
