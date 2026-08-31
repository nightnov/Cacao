'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/Button'
import { getSupabaseClient } from '@/lib/supabase'
import { groupOptions, type OptionValue, type ProductOption } from '@/lib/options'

const BUCKET = 'product-images'
const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Options fréquentes, proposées en un clic pour éviter les fautes de frappe. */
const SUGGESTED = ['Couleur', 'Stockage', 'RAM', 'Processeur']

/**
 * Configuration d'un produit : options, valeurs, suppléments et blocs.
 *
 * Chaque VALEUR porte son écart de prix. Le modèle précédent demandait un prix
 * par combinaison complète : quatre options à trois valeurs faisaient 81 lignes
 * à saisir pour un seul produit.
 *
 * Le supplément saisi ici fait foi : c'est lui que le serveur relit au moment
 * du paiement, jamais le montant affiché dans le navigateur du client.
 */
export function ProductOptionsPanel({ productId }: { productId: string }) {
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  /** Cible du téléversement en cours : quelle valeur, et laquelle de ses images. */
  const uploadTarget = useRef<{ valueId: string; field: 'image_url' | 'block_image_url' } | null>(null)

  const flash = (m: string) => {
    setNotice(m)
    setTimeout(() => setNotice(''), 2200)
  }

  const load = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: rawOptions, error: err } = await supabase
        .from('product_options')
        .select('id, product_id, name, sort_order')
        .eq('product_id', productId)
        .order('sort_order')

      if (err) throw err

      if (!rawOptions?.length) {
        setOptions([])
        return
      }

      const { data: rawValues } = await supabase
        .from('product_option_values')
        .select('*')
        .in('option_id', rawOptions.map(o => o.id))
        .order('sort_order')

      setOptions(groupOptions(rawOptions, (rawValues as OptionValue[]) || []))
    } catch (err: any) {
      // PGRST205 : la table n'est pas dans le cache de schéma, donc la migration
      // n'a pas été exécutée. Le dire évite de chercher un bug inexistant.
      setError(
        err?.code === 'PGRST205'
          ? "La migration 034 n'a pas encore été exécutée : la configuration ne peut pas être enregistrée tant que les tables n'existent pas."
          : err?.message || 'Erreur lors du chargement de la configuration'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const addOption = async (name: string) => {
    const label = name.trim()
    if (!label) return
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      const nextOrder = options.reduce((m, o) => Math.max(m, o.sort_order), -1) + 1
      const { error: err } = await supabase
        .from('product_options')
        .insert([{ product_id: productId, name: label, sort_order: nextOrder }])
      // 23505 : contrainte d'unicité. Deux options du même nom rendraient la
      // sélection ambiguë sur la fiche.
      if (err) throw new Error(err.code === '23505' ? `L'option « ${label} » existe déjà.` : err.message)
      await load()
      flash('Option ajoutée')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeOption = async (id: string) => {
    if (!confirm('Supprimer cette option et toutes ses valeurs ?')) return
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      await supabase.from('product_options').delete().eq('id', id)
      await load()
      flash('Option supprimée')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const addValue = async (option: ProductOption) => {
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const nextOrder = option.values.reduce((m, v) => Math.max(m, v.sort_order), -1) + 1
      const { error: err } = await supabase.from('product_option_values').insert([
        {
          option_id: option.id,
          label: 'Nouvelle valeur',
          sort_order: nextOrder,
          // La première valeur créée devient celle présélectionnée : sans
          // valeur par défaut, la fiche ouvrirait sur une option sans réponse.
          is_default: option.values.length === 0,
        },
      ])
      if (err) throw err
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const updateValue = async (id: string, patch: Partial<OptionValue>) => {
    setOptions(cur =>
      cur.map(o => ({ ...o, values: o.values.map(v => (v.id === id ? { ...v, ...patch } : v)) }))
    )
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase.from('product_option_values').update(patch).eq('id', id)
      if (err) throw err
    } catch (err: any) {
      setError(err.message)
      await load()
    }
  }

  /** Une seule valeur par défaut par option : l'index unique en base l'impose. */
  const setDefault = async (option: ProductOption, valueId: string) => {
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      // On retire d'abord l'ancienne, sinon l'index unique refuse l'écriture.
      await supabase
        .from('product_option_values')
        .update({ is_default: false })
        .eq('option_id', option.id)
      await supabase.from('product_option_values').update({ is_default: true }).eq('id', valueId)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeValue = async (id: string) => {
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      await supabase.from('product_option_values').delete().eq('id', id)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const moveValue = async (option: ProductOption, index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= option.values.length) return
    const a = option.values[index]
    const b = option.values[target]
    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      await Promise.all([
        supabase.from('product_option_values').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('product_option_values').update({ sort_order: a.sort_order }).eq('id', b.id),
      ])
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const target = uploadTarget.current
    uploadTarget.current = null
    if (fileRef.current) fileRef.current.value = ''
    if (!file || !target) return

    setError('')
    if (!file.type.startsWith('image/')) return setError('Le fichier doit être une image')
    if (file.size > MAX_FILE_BYTES) return setError("L'image dépasse 5 Mo")

    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `options/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      await updateValue(target.valueId, { [target.field]: data.publicUrl } as Partial<OptionValue>)
      flash('Image envoyée')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi de l'image")
    } finally {
      setBusy(false)
    }
  }

  const pickImage = (valueId: string, field: 'image_url' | 'block_image_url') => {
    uploadTarget.current = { valueId, field }
    fileRef.current?.click()
  }

  const input =
    'w-full px-3 py-2 text-sm bg-bg-raised border border-border-mid rounded-lg text-ink outline-none focus:border-border-strong transition-colors'
  const label = 'block text-[11.5px] font-semibold text-ink-dim mb-1'

  return (
    <div className="bg-bg-panel rounded-lg border border-border p-6">
      <h2 className="font-serif font-semibold text-xl text-ink mb-1">Configuration du produit</h2>
      <p className="text-sm text-ink-dimmer mb-5">
        Couleur, stockage, mémoire, processeur… Chaque valeur porte son supplément ou sa
        réduction, et le prix affiché au client s&apos;ajuste automatiquement. Une valeur peut
        aussi porter son propre bloc explicatif, affiché sous la fiche quand elle est choisie.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-green/10 border border-green/30 text-green-bright px-4 py-3 rounded mb-4 text-sm font-semibold">
          ✓ {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-dimmer">Chargement…</p>
      ) : (
        <>
          {options.length === 0 && (
            <p className="text-sm text-ink-dimmer mb-4">
              Aucune option pour ce produit. Le client verra simplement son prix de base.
            </p>
          )}

          <div className="space-y-5">
            {options.map(option => (
              <section key={option.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-ink">{option.name}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(option.id)}
                    disabled={busy}
                    className="text-danger"
                  >
                    <Trash2 size={14} /> Supprimer l&apos;option
                  </Button>
                </div>

                <div className="space-y-4">
                  {option.values.map((value, i) => (
                    <div key={value.id} className="border border-border rounded-lg p-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,160px] gap-3">
                        <div>
                          <label className={label}>Nom de la valeur</label>
                          <input
                            className={input}
                            defaultValue={value.label}
                            onBlur={e => updateValue(value.id, { label: e.target.value.trim() || 'Sans nom' })}
                          />
                        </div>
                        <div>
                          <label className={label}>Supplément (FCFA)</label>
                          <input
                            type="number"
                            step={1000}
                            className={input}
                            defaultValue={value.price_delta_fcfa}
                            onBlur={e =>
                              updateValue(value.id, {
                                price_delta_fcfa: Math.round(Number(e.target.value) || 0),
                              })
                            }
                          />
                          <p className="text-[11px] text-ink-dimmer mt-1">
                            Négatif pour une réduction.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className={label}>Phrase sous le sélecteur (facultatif)</label>
                        <input
                          className={input}
                          defaultValue={value.description || ''}
                          onBlur={e =>
                            updateValue(value.id, { description: e.target.value.trim() || null })
                          }
                        />
                      </div>

                      {/* Bloc affiché dans la section Description quand cette
                          valeur est retenue par le client. */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[11.5px] font-semibold text-ink-dim mb-2">
                          Bloc explicatif affiché quand cette valeur est choisie
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            className={input}
                            placeholder="Titre du bloc"
                            defaultValue={value.block_title || ''}
                            onBlur={e =>
                              updateValue(value.id, { block_title: e.target.value.trim() || null })
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => pickImage(value.id, 'block_image_url')}
                            disabled={busy}
                          >
                            <Upload size={14} />
                            {value.block_image_url ? 'Remplacer l’image du bloc' : 'Image du bloc'}
                          </Button>
                        </div>
                        <textarea
                          className={`${input} mt-3`}
                          rows={3}
                          placeholder="Ce que permet cette option, pour quels usages…"
                          defaultValue={value.block_body || ''}
                          onBlur={e =>
                            updateValue(value.id, { block_body: e.target.value.trim() || null })
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer mr-2">
                          <input
                            type="checkbox"
                            checked={value.is_active}
                            onChange={e => updateValue(value.id, { is_active: e.target.checked })}
                            className="w-4 h-4 accent-gold"
                          />
                          Disponible
                        </label>
                        <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer mr-2">
                          <input
                            type="radio"
                            name={`default-${option.id}`}
                            checked={value.is_default}
                            onChange={() => setDefault(option, value.id)}
                            className="w-4 h-4 accent-gold"
                          />
                          Par défaut
                        </label>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => pickImage(value.id, 'image_url')}
                          disabled={busy}
                        >
                          <Upload size={14} /> {value.image_url ? 'Changer le visuel' : 'Visuel'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveValue(option, i, -1)}
                          disabled={i === 0 || busy}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveValue(option, i, 1)}
                          disabled={i === option.values.length - 1 || busy}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeValue(value.id)}
                          disabled={busy}
                          className="text-danger"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addValue(option)}
                  disabled={busy}
                  className="mt-3"
                >
                  <Plus size={14} /> Ajouter une valeur
                </Button>
              </section>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <p className={label}>Ajouter une option</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.filter(n => !options.some(o => o.name === n)).map(name => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(name)}
                  disabled={busy}
                >
                  <Plus size={14} /> {name}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = prompt('Nom de l’option ?')
                  if (name) addOption(name)
                }}
                disabled={busy}
              >
                <Plus size={14} /> Autre…
              </Button>
            </div>
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
