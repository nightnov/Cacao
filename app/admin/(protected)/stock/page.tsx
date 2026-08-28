'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { formatAmount } from '@/lib/format'
import {
  AlertTriangle,
  Loader2,
  PackageX,
  Save,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'

interface VariantRow {
  id: string
  product_id: string
  option_values: Record<string, string>
  sku: string | null
  stock: number
  price_fcfa: number
  products: { name: string; slug: string } | null
}

interface Movement {
  id: string
  delta: number
  stock_after: number | null
  reason: string
  note: string | null
  created_at: string
  product_id: string | null
}

type Filter = 'all' | 'out' | 'low'

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'

const REASON_LABELS: Record<string, string> = {
  sale: 'Vente',
  restock: 'Réapprovisionnement',
  manual: 'Correction manuelle',
  cancellation: 'Annulation',
}

function variantLabel(values: Record<string, string>): string {
  const entries = Object.entries(values || {})
  if (!entries.length) return 'Variante unique'
  return entries.map(([k, v]) => `${k} : ${v}`).join(' · ')
}

export default function AdminStock() {
  const [rows, setRows] = useState<VariantRow[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [threshold, setThreshold] = useState(2)
  const [thresholdDraft, setThresholdDraft] = useState('2')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const [variantsRes, settingRes, movementsRes] = await Promise.all([
      supabase
        .from('product_variants')
        .select('id, product_id, option_values, sku, stock, price_fcfa, products(name, slug)')
        .order('stock'),
      supabase.from('site_settings').select('value').eq('key', 'low_stock_threshold').maybeSingle(),
      supabase
        .from('stock_movements')
        .select('id, delta, stock_after, reason, note, created_at, product_id')
        .order('created_at', { ascending: false })
        .limit(15),
    ])

    setRows((variantsRes.data || []) as unknown as VariantRow[])

    // La migration 020 apporte à la fois la table des mouvements et le seuil.
    setMissingTable(!!movementsRes.error)
    setMovements((movementsRes.data || []) as Movement[])

    const t = Number(settingRes.data?.value)
    const safe = Number.isFinite(t) && t >= 0 ? t : 2
    setThreshold(safe)
    setThresholdDraft(String(safe))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(
    () => ({
      all: rows.length,
      out: rows.filter(r => r.stock === 0).length,
      low: rows.filter(r => r.stock > 0 && r.stock <= threshold).length,
    }),
    [rows, threshold]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filter === 'out' && r.stock !== 0) return false
      if (filter === 'low' && !(r.stock > 0 && r.stock <= threshold)) return false
      if (!q) return true
      return (
        (r.products?.name || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        variantLabel(r.option_values).toLowerCase().includes(q)
      )
    })
  }, [rows, filter, threshold, search])

  const pending = Object.entries(edits).filter(([id, value]) => {
    const row = rows.find(r => r.id === id)
    const n = Number(value)
    return row && value !== '' && Number.isInteger(n) && n >= 0 && n !== row.stock
  })

  const saveStock = async () => {
    if (!pending.length) return
    setBusy(true)
    setMessage(null)
    const supabase = getSupabaseClient()

    try {
      for (const [id, value] of pending) {
        const row = rows.find(r => r.id === id)!
        const next = Number(value)

        const { error } = await supabase
          .from('product_variants')
          .update({ stock: next, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw new Error(error.message)

        // Journalisé pour qu'une correction manuelle reste explicable plus tard.
        // Un échec ici n'annule pas la correction du stock, qui est le but
        // premier : on préfère un mouvement manquant à un stock resté faux.
        const delta = next - row.stock
        const { error: logError } = await supabase.from('stock_movements').insert({
          variant_id: id,
          product_id: row.product_id,
          delta,
          stock_after: next,
          reason: delta > 0 ? 'restock' : 'manual',
        })
        if (logError) console.error('Mouvement non journalisé', logError)
      }

      setEdits({})
      await load()
      setMessage({
        kind: 'ok',
        text: `${pending.length} stock${pending.length > 1 ? 's' : ''} mis à jour.`,
      })
    } catch (err: any) {
      setMessage({ kind: 'ko', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const saveThreshold = async () => {
    const n = Number(thresholdDraft)
    if (!Number.isInteger(n) || n < 0) {
      setMessage({ kind: 'ko', text: 'Le seuil doit être un nombre entier positif.' })
      return
    }
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'low_stock_threshold', value: String(n) }, { onConflict: 'key' })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    setThreshold(n)
    setMessage({ kind: 'ok', text: `Seuil d’alerte réglé sur ${n}.` })
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
      <div>
        <h1 className="font-serif text-3xl text-[#241A14]">Stock</h1>
        <p className="text-sm text-[#7D6A5D] mt-1">
          Toutes les déclinaisons de tous les produits, la plus basse en premier.
        </p>
      </div>

      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Le suivi des mouvements n’est pas encore installé.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-amber-100 px-1 rounded">
                supabase/migrations/020_stock_movements.sql
              </code>{' '}
              dans l’éditeur SQL de Supabase. Sans lui, le stock <strong>n’est pas déduit</strong>{' '}
              après un paiement : vous pouvez vendre plusieurs fois la même dernière unité.
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

      {/* ── Compteurs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label="Déclinaisons suivies" value={counts.all} />
        <Kpi
          label={`Stock faible (≤ ${threshold})`}
          value={counts.low}
          tone={counts.low ? 'warn' : undefined}
          icon={TrendingDown}
        />
        <Kpi
          label="Épuisées"
          value={counts.out}
          tone={counts.out ? 'bad' : undefined}
          icon={PackageX}
        />
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <section className={CARD}>
        <div className="p-4 border-b border-[#E8E0D8] flex flex-wrap items-center gap-2">
          {(
            [
              ['all', `Toutes (${counts.all})`],
              ['low', `Stock faible (${counts.low})`],
              ['out', `Épuisées (${counts.out})`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-orange-50 text-[#C2410C] border border-[#C2410C]'
                  : 'border border-[#E8E0D8] text-[#5B4B41] hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Produit, référence…"
            className="ml-auto px-3 py-1.5 border border-[#E8E0D8] rounded-lg text-xs text-[#241A14] w-full sm:w-56"
          />
        </div>

        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#7D6A5D]">
            {rows.length === 0
              ? "Aucun produit n'a de déclinaison. Le stock se gère par variante — ajoutez des options à un produit pour le suivre ici."
              : 'Aucune déclinaison ne correspond à ce filtre.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E0D8]">
                  <Th>Produit</Th>
                  <Th>Déclinaison</Th>
                  <Th>Référence</Th>
                  <Th>Prix</Th>
                  <Th>Stock</Th>
                  <Th>Nouveau</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const out = r.stock === 0
                  const low = r.stock > 0 && r.stock <= threshold
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[#F1EBE3] last:border-0 ${out ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        {r.products?.slug ? (
                          <Link
                            href={`/products/${r.products.slug}`}
                            target="_blank"
                            className="text-[#241A14] hover:text-[#C2410C] font-medium"
                          >
                            {r.products.name}
                          </Link>
                        ) : (
                          <span className="text-[#7D6A5D]">Produit supprimé</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5B4B41]">
                        {variantLabel(r.option_values)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#7D6A5D]">
                        {r.sku || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#241A14] tabular-nums whitespace-nowrap">
                        {formatAmount(r.price_fcfa)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                            out
                              ? 'bg-red-100 text-red-800'
                              : low
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {out ? 'Épuisé' : r.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={edits[r.id] ?? ''}
                          onChange={e => setEdits({ ...edits, [r.id]: e.target.value })}
                          placeholder={String(r.stock)}
                          className="w-20 px-2 py-1 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14] tabular-nums"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {pending.length > 0 && (
          <div className="p-4 border-t border-[#E8E0D8] flex items-center gap-3 bg-orange-50/50">
            <span className="text-sm text-[#5B4B41]">
              {pending.length} modification{pending.length > 1 ? 's' : ''} en attente
            </span>
            <button
              onClick={saveStock}
              disabled={busy}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-xl font-semibold text-sm"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
            <button
              onClick={() => setEdits({})}
              className="px-4 py-2 border border-[#E8E0D8] hover:bg-white text-[#5B4B41] rounded-xl font-semibold text-sm"
            >
              Annuler
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Seuil ───────────────────────────────────────────────────── */}
        <section className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-[#241A14]">Seuil d’alerte</h2>
          <p className="text-xs text-[#7D6A5D] mt-1 mb-4">
            En dessous ou à ce nombre, une déclinaison est signalée « stock faible ». À zéro, elle
            devient « épuisée » et la fiche produit refuse déjà de l’ajouter au panier.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={thresholdDraft}
              onChange={e => setThresholdDraft(e.target.value)}
              className="w-24 px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14] tabular-nums"
            />
            <button
              onClick={saveThreshold}
              disabled={busy || String(threshold) === thresholdDraft}
              className="px-4 py-2 border border-[#E8E0D8] hover:bg-gray-50 disabled:opacity-40 text-[#241A14] rounded-xl font-semibold text-sm"
            >
              Enregistrer
            </button>
          </div>
        </section>

        {/* ── Mouvements ──────────────────────────────────────────────── */}
        <section className={CARD}>
          <div className="p-5 pb-3">
            <h2 className="font-serif text-lg text-[#241A14]">Derniers mouvements</h2>
            <p className="text-xs text-[#7D6A5D] mt-1">
              Pourquoi un stock a bougé, et de combien.
            </p>
          </div>
          {movements.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[#7D6A5D]">
              Aucun mouvement pour l’instant. Ils apparaîtront à la première vente payée ou à la
              première correction manuelle.
            </p>
          ) : (
            <ul className="divide-y divide-[#F1EBE3]">
              {movements.map(m => (
                <li key={m.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span
                    className={`font-bold tabular-nums w-10 ${
                      m.delta < 0 ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="text-[#5B4B41] flex-1 min-w-0 truncate">
                    {REASON_LABELS[m.reason] || m.reason}
                    {m.stock_after !== null && (
                      <span className="text-[#7D6A5D]"> → reste {m.stock_after}</span>
                    )}
                  </span>
                  <span className="text-xs text-[#7D6A5D] whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#7D6A5D] whitespace-nowrap">
      {children}
    </th>
  )
}

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone?: 'warn' | 'bad'
  icon?: LucideIcon
}) {
  const color =
    tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-[#241A14]'
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-1.5 text-xs text-[#7D6A5D] mb-1.5">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <p className={`font-serif text-3xl tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
