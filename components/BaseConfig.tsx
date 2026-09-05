import { specIcon } from '@/lib/specIcons'
import type { GlossaryEntry } from '@/lib/glossary'

/**
 * Configuration de base, affichée juste sous le prix.
 *
 * Ce bloc avait été retiré au motif que les sélecteurs de configuration
 * montraient déjà le processeur et la mémoire retenus. Ce raisonnement ne
 * valait que pour les produits configurés : sur une fiche sans options — la
 * majorité du catalogue — plus rien n'apparaissait, et l'acheteur devait
 * dérouler la section Description pour savoir ce qu'il achetait.
 *
 * Il dit ce que la machine EST, avant toute personnalisation. Le résumé de la
 * configuration choisie, lui, reste plus bas, sous les sélecteurs : les deux
 * répondent à deux questions différentes, « qu'est ce que c'est » et « qu'est
 * ce que j'ai ajouté ».
 *
 * L'ordre suit celui du glossaire plutôt que celui de la saisie : le
 * processeur avant la connectique, sur toutes les fiches, quelle que soit la
 * façon dont le vendeur a rempli le formulaire.
 */
export function BaseConfig({
  specs,
  glossary,
}: {
  specs: Record<string, unknown>
  glossary: GlossaryEntry[]
}) {
  const lignes = [...glossary]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(entry => ({ entry, valeur: String(specs?.[entry.key] ?? '').trim() }))
    .filter(l => l.valeur !== '')

  // Une fiche sans aucune caractéristique saisie ne doit pas afficher un cadre
  // vide surmonté d'un titre : mieux vaut que le bloc n'existe pas.
  if (lignes.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-bg-raised px-4 py-3.5 mt-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-3">
        Configuration de base
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
        {lignes.map(({ entry, valeur }) => {
          const Icon = specIcon(entry.icon)
          return (
            <div key={entry.key} className="flex items-start gap-2.5">
              <Icon
                size={17}
                strokeWidth={1.7}
                className="text-accent flex-shrink-0 mt-[3px]"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <dt className="text-[11.5px] text-ink-faint leading-tight">{entry.label}</dt>
                <dd className="text-[13.5px] text-ink font-medium leading-snug">{valeur}</dd>
              </div>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
