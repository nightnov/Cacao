'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatAmount } from '@/lib/format'
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'

type Kind = 'percent' | 'amount' | 'free_shipping'

interface Promotion {
  id?: string
  code: string
  description: string | null
  kind: Kind
  value: number
  min_order_fcfa: number
  starts_on: string | null
  ends_on: string | null
  max_uses: number | null
  used_count: number
  once_per_customer: boolean
  is_active: boolean
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const LABEL = 'block text-xs font-semibold text-[#5B4B41] mb-1.5'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'

const BLANK: Promotion = {
  code: '',
  description: null,
  kind: 'percent',
  value: 10,
  min_order_fcfa: 0,
  starts_on: null,
  ends_on: null,
  max_uses: null,
  used_count: 0,
  once_per_customer: false,
  is_active: true,
}

function statusOf(p: Promotion): { label: string; cls: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (!p.is_active) return { label: 'Désactivée', cls: 'bg-gray-100 text-[#5B4B41]' }
  if (p.max_uses !== null && p.used_count >= p.max_uses)
    return { label: 'Épuisée', cls: 'bg-red-100 text-red-800' }
  if (p.starts_on && today < p.starts_on)
    return { label: 'Programmée', cls: 'bg-amber-100 text-amber-800' }
  if (p.ends_on && today > p.ends_on)
    return { label: 'Terminée', cls: 'bg-gray-100 text-[#5B4B41]' }
  return { label: 'Active', cls: 'bg-green-100 text-green-800' }
}

function describe(p: Promotion): string {
  if (p.kind === 'percent') return `−${p.value} %`
  if (p.kind === 'amount') return `−${formatAmount(p.value)} FCFA`
  return 'Livraison offerte'
}

export default function AdminPromotions() {
  const [rows, setRows] = useState<Promotion[]>([])
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)

  const [volumeEnabled, setVolumeEnabled] = useState(true)
  const [volumeThreshold, setVolumeThreshold] = useState('1000000')
  const [volumePercent, setVolumePercent] = useState('10')
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const [promosRes, settingsRes] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'volume_discount_enabled',
          'volume_discount_threshold_fcfa',
          'volume_discount_percent',
        ]),
    ])

    setMissingTable(!!promosRes.error)
    setRows((promosRes.data || []) as Promotion[])

    const s = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value]))
    setVolumeEnabled(s.volume_discount_enabled !== 'false')
    if (s.volume_discount_threshold_fcfa) setVolumeThreshold(s.volume_discount_threshold_fcfa)
    if (s.volume_discount_percent) setVolumePercent(s.volume_discount_percent)

    setLoading(false)
  }

  const saveVolume = async () => {
    const threshold = Number(volumeThreshold)
    const percent = Number(volumePercent)

    if (!Number.isFinite(threshold) || threshold < 0) {
      setMessage({ kind: 'ko', text: 'Le seuil doit être un montant positif.' })
      return
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      setMessage({ kind: 'ko', text: 'La remise doit être un entier entre 1 et 100.' })
      return
    }

    setBusy(true)
    setMessage(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('site_settings').upsert(
      [
        { key: 'volume_discount_enabled', value: volumeEnabled ? 'true' : 'false' },
        { key: 'volume_discount_threshold_fcfa', value: String(Math.round(threshold)) },
        { key: 'volume_discount_percent', value: String(percent) },
      ],
      { onConflict: 'key' }
    )
    setBusy(false)

    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({ kind: 'ok', text: 'Remise sur gros panier enregistrée.' })
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const s = { active: 0, scheduled: 0, over: 0 }
    for (const p of rows) {
      const label = statusOf(p).label
      if (label === 'Active') s.active++
      else if (label === 'Programmée') s.scheduled++
      else s.over++
    }
    return s
  }, [rows])

  const save = async () => {
    if (!editing) return

    const code = editing.code.trim().toUpperCase()
    if (!/^[A-Z0-9-]{3,24}$/.test(code)) {
      setMessage({
        kind: 'ko',
        text: 'Le code doit faire 3 à 24 caractères, en lettres, chiffres ou tirets.',
      })
      return
    }
    if (editing.kind === 'percent' && (editing.value < 1 || editing.value > 100)) {
      setMessage({ kind: 'ko', text: 'Un pourcentage doit être compris entre 1 et 100.' })
      return
    }
    if (editing.kind === 'amount' && editing.value <= 0) {
      setMessage({ kind: 'ko', text: 'Le montant de la remise doit être supérieur à zéro.' })
      return
    }
    if (editing.starts_on && editing.ends_on && editing.ends_on < editing.starts_on) {
      setMessage({ kind: 'ko', text: 'La date de fin précède la date de début.' })
      return
    }

    setBusy(true)
    setMessage(null)
    const supabase = getSupabaseClient()
    const payload = {
      ...(editing.id ? { id: editing.id } : {}),
      code,
      description: editing.description?.trim() || null,
      kind: editing.kind,
      value: editing.kind === 'free_shipping' ? 0 : Math.round(editing.value),
      min_order_fcfa: Math.max(0, Math.round(editing.min_order_fcfa) || 0),
      starts_on: editing.starts_on || null,
      ends_on: editing.ends_on || null,
      max_uses: editing.max_uses === null ? null : Math.max(1, Math.round(editing.max_uses)),
      once_per_customer: editing.once_per_customer,
      is_active: editing.is_active,
    }

    const { error } = await supabase.from('promotions').upsert(payload)
    setBusy(false)

    if (error) {
      setMessage({
        kind: 'ko',
        text: error.message.includes('duplicate')
          ? 'Ce code existe déjà.'
          : error.message,
      })
      return
    }
    await load()
    setEditing(null)
    setMessage({ kind: 'ok', text: 'Promotion enregistrée.' })
  }

  const remove = async (p: Promotion) => {
    if (p.used_count > 0) {
      setMessage({
        kind: 'ko',
        text: `« ${p.code} » a déjà servi ${p.used_count} fois. Désactivez-la plutôt que de la supprimer, pour garder la trace sur les commandes concernées.`,
      })
      return
    }
    if (!confirm(`Supprimer le code « ${p.code} » ?`)) return
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('promotions').delete().eq('id', p.id!)
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setEditing(null)
    setMessage({ kind: 'ok', text: 'Promotion supprimée.' })
  }

  const toggleActive = async (p: Promotion) => {
    const supabase = getSupabaseClient()
    setBusy(true)
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id!)
    setBusy(false)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5B4B41] text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#241A14]">Promotions</h1>
          <p className="text-sm text-[#7D6A5D] mt-1">
            {counts.active} active{counts.active > 1 ? 's' : ''} · {counts.scheduled} programmée
            {counts.scheduled > 1 ? 's' : ''} · {counts.over} terminée{counts.over > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing({ ...BLANK })
            setMessage(null)
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl font-semibold text-sm whitespace-nowrap"
        >
          <Plus size={15} /> Nouvelle promotion
        </button>
      </div>

      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">La table des promotions n’existe pas encore.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-amber-100 px-1 rounded">
                supabase/migrations/022_promotions.sql
              </code>{' '}
              dans l’éditeur SQL de Supabase, puis rechargez.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm border ${
            message.kind === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {editing && (
        <section className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-[#241A14] mb-4">
            {editing.id ? `Modifier « ${editing.code} »` : 'Nouvelle promotion'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>CODE</label>
              <input
                value={editing.code}
                onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                placeholder="RENTREE10"
                className={`${INPUT} font-mono`}
              />
              <p className="text-[11px] text-[#7D6A5D] mt-1">
                Ce que le client saisit au moment de payer. La casse n’a pas d’importance.
              </p>
            </div>
            <div>
              <label className={LABEL}>TYPE DE REMISE</label>
              <select
                value={editing.kind}
                onChange={e => setEditing({ ...editing, kind: e.target.value as Kind })}
                className={INPUT}
              >
                <option value="percent">Pourcentage du panier</option>
                <option value="amount">Montant fixe en FCFA</option>
                <option value="free_shipping">Livraison offerte</option>
              </select>
            </div>

            {editing.kind !== 'free_shipping' && (
              <div>
                <label className={LABEL}>
                  {editing.kind === 'percent' ? 'POURCENTAGE (1 À 100)' : 'MONTANT (FCFA)'}
                </label>
                <input
                  type="number"
                  value={editing.value}
                  onChange={e => setEditing({ ...editing, value: Number(e.target.value) })}
                  className={INPUT}
                />
              </div>
            )}

            <div>
              <label className={LABEL}>PANIER MINIMUM (FCFA)</label>
              <input
                type="number"
                min={0}
                value={editing.min_order_fcfa}
                onChange={e => setEditing({ ...editing, min_order_fcfa: Number(e.target.value) })}
                className={INPUT}
              />
              <p className="text-[11px] text-[#7D6A5D] mt-1">0 pour aucune condition.</p>
            </div>

            <div>
              <label className={LABEL}>DÉBUT (FACULTATIF)</label>
              <input
                type="date"
                value={editing.starts_on || ''}
                onChange={e => setEditing({ ...editing, starts_on: e.target.value || null })}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>FIN (FACULTATIF, INCLUSE)</label>
              <input
                type="date"
                value={editing.ends_on || ''}
                onChange={e => setEditing({ ...editing, ends_on: e.target.value || null })}
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>NOMBRE MAXIMUM D’UTILISATIONS</label>
              <input
                type="number"
                min={1}
                value={editing.max_uses ?? ''}
                onChange={e =>
                  setEditing({
                    ...editing,
                    max_uses: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Illimité"
                className={INPUT}
              />
              <p className="text-[11px] text-[#7D6A5D] mt-1">
                Compté à la confirmation du paiement, pas à la mise au panier.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>DESCRIPTION INTERNE (FACULTATIVE)</label>
              <input
                value={editing.description || ''}
                onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="Opération rentrée scolaire"
                className={INPUT}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-[#E8E0D8]">
            <label className="flex items-center gap-2 text-sm text-[#241A14]">
              <input
                type="checkbox"
                checked={editing.once_per_customer}
                onChange={e => setEditing({ ...editing, once_per_customer: e.target.checked })}
              />
              Une seule utilisation par client
            </label>
            <label className="flex items-center gap-2 text-sm text-[#241A14]">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={save}
              disabled={busy}
              className="px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-xl font-semibold text-sm"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-[#E8E0D8] hover:bg-gray-50 text-[#5B4B41] rounded-xl font-semibold text-sm"
            >
              Annuler
            </button>
            {editing.id && (
              <button
                onClick={() => remove(editing)}
                disabled={busy}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 text-red-700 hover:bg-red-50 rounded-xl font-semibold text-sm"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Remise automatique sur gros panier ────────────────────────── */}
      <section className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-[#241A14]">Remise sur gros panier</h2>
        <p className="text-xs text-[#7D6A5D] mt-1 mb-4">
          Accordée automatiquement dès que le montant des articles franchit le seuil. Le client n’a
          rien à saisir ni à composer.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>SEUIL (FCFA)</label>
            <input
              type="number"
              min={0}
              value={volumeThreshold}
              onChange={e => setVolumeThreshold(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>REMISE (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={volumePercent}
              onChange={e => setVolumePercent(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-2.5 mt-3 text-[12px] text-[#5B4B41]">
          Un panier de {formatAmount(Number(volumeThreshold) || 0)} FCFA donnerait{' '}
          <strong className="text-[#241A14]">
            {formatAmount(
              Math.round(((Number(volumeThreshold) || 0) * (Number(volumePercent) || 0)) / 100)
            )}{' '}
            FCFA
          </strong>{' '}
          de remise. Elle porte sur les articles seulement, jamais sur la livraison — celle-ci est
          avancée au transporteur.
        </div>

        <label className="flex items-center gap-2 text-sm text-[#241A14] mt-4">
          <input
            type="checkbox"
            checked={volumeEnabled}
            onChange={e => setVolumeEnabled(e.target.checked)}
          />
          Activer la remise sur gros panier
        </label>

        <p className="text-[12px] text-[#7D6A5D] mt-3">
          Elle ne se cumule pas avec un code : la plus avantageuse des deux s’applique. Les
          additionner atteindrait vite 20 % sur des montants à sept chiffres.
        </p>

        <button
          onClick={saveVolume}
          disabled={busy}
          className="mt-4 px-5 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </section>

      <section className={CARD}>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#7D6A5D]">
            Aucune promotion. Créez un code pour qu’il devienne saisissable au moment de payer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E0D8]">
                  {['Code', 'Remise', 'Condition', 'Période', 'Utilisée', 'Statut', ''].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#7D6A5D] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const st = statusOf(p)
                  return (
                    <tr key={p.id} className="border-b border-[#F1EBE3] last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-sm text-[#241A14]">{p.code}</span>
                        {p.description && (
                          <p className="text-[11px] text-[#7D6A5D]">{p.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#241A14] whitespace-nowrap">
                        {describe(p)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5B4B41] whitespace-nowrap">
                        {p.min_order_fcfa > 0
                          ? `Dès ${formatAmount(p.min_order_fcfa)} FCFA`
                          : '—'}
                        {p.once_per_customer && (
                          <span className="block text-[11px] text-[#7D6A5D]">1 fois par client</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5B4B41] whitespace-nowrap">
                        {p.starts_on || p.ends_on
                          ? `${p.starts_on || '…'} → ${p.ends_on || '…'}`
                          : 'Sans limite'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#241A14] tabular-nums whitespace-nowrap">
                        {p.used_count} / {p.max_uses ?? '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditing({ ...p })
                            setMessage(null)
                          }}
                          className="text-sm font-semibold text-[#C2410C] hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={busy}
                          className="ml-3 text-sm text-[#5B4B41] hover:underline"
                        >
                          {p.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[#7D6A5D] leading-relaxed">
        La réduction est recalculée par le serveur au moment du paiement, à partir des prix en base.
        Un client qui modifierait le montant dans son navigateur paierait quand même le prix juste.
      </p>
    </div>
  )
}
