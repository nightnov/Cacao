'use client'

import React, { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { FALLBACK_GLOSSARY, type GlossaryEntry } from '@/lib/glossary'

/**
 * Glossaire des composants : les explications affichées sur toutes les fiches
 * produit, pour le client qui ne sait pas ce qu'est une mémoire vive.
 *
 * Un seul texte par pièce sert tout le catalogue. C'est le principe : ajouter
 * un produit ne demande aucune ressaisie, et corriger une explication ici la
 * corrige partout d'un coup.
 *
 * L'image est facultative. Tant qu'aucune photo n'est téléversée, la fiche
 * affiche un pictogramme du site — jamais une image prise ailleurs.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

export function GlossaryPanel() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [missingTable, setMissingTable] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const targetKey = useRef<string | null>(null)

  const flash = (message: string) => {
    setNotice(message)
    setTimeout(() => setNotice(''), 2500)
  }

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabaseClient()
      const { data, error: err } = await supabase
        .from('component_glossary')
        .select('key, label, title, body, image_url, icon, sort_order')
        .order('sort_order')

      if (err) {
        // La table n'existe pas encore : on le dit clairement plutôt que
        // d'afficher un écran vide qui laisserait croire à une perte.
        setMissingTable(true)
        setEntries(FALLBACK_GLOSSARY)
      } else {
        setEntries((data as GlossaryEntry[]) || [])
      }
      setLoading(false)
    })()
  }, [])

  const patch = (key: string, changes: Partial<GlossaryEntry>) =>
    setEntries(list => list.map(e => (e.key === key ? { ...e, ...changes } : e)))

  const save = async (entry: GlossaryEntry) => {
    setError('')
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase
        .from('component_glossary')
        .update({
          label: entry.label,
          title: entry.title,
          body: entry.body,
          image_url: entry.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('key', entry.key)
      if (err) throw err
      flash(`« ${entry.label} » enregistré`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  const pickImage = (key: string) => {
    targetKey.current = key
    fileRef.current?.click()
  }

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const key = targetKey.current
    targetKey.current = null
    if (fileRef.current) fileRef.current.value = ''
    if (!file || !key) return

    setError('')
    if (!file.type.startsWith('image/')) return setError('Le fichier doit être une image')
    if (file.size > MAX_FILE_BYTES) return setError("L'image dépasse 5 Mo")

    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `glossaire/${key}-${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { error: updErr } = await supabase
        .from('component_glossary')
        .update({ image_url: data.publicUrl })
        .eq('key', key)
      if (updErr) throw updErr

      patch(key, { image_url: data.publicUrl })
      flash('Image enregistrée')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléversement impossible')
    } finally {
      setBusy(false)
    }
  }

  const removeImage = async (key: string) => {
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase
        .from('component_glossary')
        .update({ image_url: null })
        .eq('key', key)
      if (err) throw err
      patch(key, { image_url: null })
      flash('Image retirée, le pictogramme reprend sa place')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-dimmer">Chargement du glossaire…</p>

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {missingTable && (
        <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-ink-dim">
          La table du glossaire n&apos;existe pas encore en base. Le site affiche pour
          l&apos;instant un texte de secours intégré au code, et rien ne peut être
          enregistré ici. Exécutez la migration
          <code className="mx-1 font-mono">038_glossaire_composants.sql</code>
          puis rechargez cette page.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-ink">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-green-bright/40 bg-green-bright/10 p-3 text-sm text-ink">{notice}</div>
      )}

      {entries.map(entry => (
        <section key={entry.key} className="rounded-xl border border-border bg-bg-panel p-5">
          <div className="flex items-start gap-5">
            <div className="w-28 flex-shrink-0">
              {entry.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.image_url}
                  alt=""
                  className="w-28 h-28 object-contain rounded-lg border border-border bg-bg-raised p-2"
                />
              ) : (
                <div className="w-28 h-28 rounded-lg border border-dashed border-border-strong bg-bg-raised flex items-center justify-center text-center text-[11px] text-ink-dimmer px-2">
                  Aucune image, un pictogramme s&apos;affiche
                </div>
              )}
              <div className="mt-2 flex flex-col gap-1">
                <button
                  type="button"
                  disabled={busy || missingTable}
                  onClick={() => pickImage(entry.key)}
                  className="text-[12px] font-semibold text-accent hover:underline disabled:opacity-40"
                >
                  {entry.image_url ? "Remplacer l'image" : 'Ajouter une image'}
                </button>
                {entry.image_url && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeImage(entry.key)}
                    className="text-[12px] text-ink-dimmer hover:text-danger disabled:opacity-40"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[12px] font-semibold text-ink-dim mb-1">
                    Nom affiché dans le sommaire
                  </span>
                  <input
                    value={entry.label}
                    onChange={e => patch(entry.key, { label: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-semibold text-ink-dim mb-1">
                    Titre de l&apos;explication
                  </span>
                  <input
                    value={entry.title}
                    onChange={e => patch(entry.key, { title: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink"
                  />
                </label>
              </div>

              {/* Adresse d'image, en complément du téléversement. Coller un
                  lien est plus rapide quand la photo est déjà en ligne, et
                  c'est le seul moyen d'utiliser une banque d'images à laquelle
                  vous avez droit. Attention : une image hébergée ailleurs
                  disparaît le jour où son propriétaire la déplace, et n'utilisez
                  que des visuels dont l'usage vous est autorisé. */}
              <label className="block">
                <span className="block text-[12px] font-semibold text-ink-dim mb-1">
                  Adresse de l&apos;image (si elle est déjà en ligne)
                </span>
                <input
                  value={entry.image_url || ''}
                  onChange={e => patch(entry.key, { image_url: e.target.value })}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink font-mono text-[12px]"
                />
                <span className="block text-[11px] text-ink-dimmer mt-1">
                  Téléverser votre propre photo reste plus sûr : un lien externe casse
                  si la page d&apos;origine change. N&apos;employez que des images dont
                  vous avez le droit d&apos;usage.
                </span>
              </label>

              <label className="block">
                <span className="block text-[12px] font-semibold text-ink-dim mb-1">
                  Explication pour un client qui découvre
                </span>
                <textarea
                  value={entry.body}
                  onChange={e => patch(entry.key, { body: e.target.value })}
                  rows={7}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink leading-relaxed"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11.5px] text-ink-dimmer">
                  Ce texte s&apos;affiche sur toutes les fiches dont la caractéristique
                  <code className="mx-1 font-mono">{entry.key}</code>
                  est renseignée. Évitez d&apos;y promettre une performance : il sert le
                  catalogue entier.
                </p>
                <button
                  type="button"
                  disabled={busy || missingTable}
                  onClick={() => save(entry)}
                  className="flex-shrink-0 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-ink-invert hover:bg-accent-dim disabled:opacity-40"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
