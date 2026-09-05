import { Check } from 'lucide-react'

/**
 * Ce qui est livré avec l'appareil.
 *
 * Le même modèle arrive parfois avec un clavier et une souris, parfois seul.
 * C'est ce qui départage deux annonces au même prix, et la première source de
 * réclamation quand le client attendait un accessoire qui n'est jamais venu.
 *
 * Placé sous la configuration de base : on lit d'abord ce qu'est la machine,
 * ensuite ce qui l'accompagne.
 *
 * Rien ne s'affiche quand la liste est vide. Une phrase du genre « aucun
 * accessoire fourni » serait une affirmation, alors qu'une liste vide veut
 * seulement dire que la question n'a pas été renseignée.
 */
export function IncludedItems({ items }: { items: string[] }) {
  const propres = items.map(i => i.trim()).filter(Boolean)
  if (propres.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-bg-raised px-4 py-3.5 mt-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2.5">
        Livré avec
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
        {propres.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-start gap-2 text-[13.5px] text-ink">
            <Check
              size={15}
              strokeWidth={2.4}
              className="text-accent flex-shrink-0 mt-[3px]"
              aria-hidden="true"
            />
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
