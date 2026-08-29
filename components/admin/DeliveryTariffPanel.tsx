'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  PARCEL_SIZES,
  SIZE_LABELS,
  isParcelSize,
  DEFAULT_PARCEL_SIZE,
  type ParcelSize,
} from '@/lib/delivery'
import { formatAmount } from '@/lib/format'

interface Zone {
  id: string
  city: string
  price_fcfa: number
  parent_city: string | null
  is_active: boolean
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'
const LABEL = 'block text-xs font-semibold text-[#5B4B41] mb-1.5'

/**
 * Grille de livraison : un prix par zone et par taille de colis.
 *
 * Aucun transporteur n'est nommé, ici comme côté client. La grille décrit ce
 * que le client paie, pas qui porte le colis : ce choix se fait commande par
 * commande, en dehors du site.
 *
 * La saisie est un tableau plutôt qu'un formulaire par zone : avec treize
 * communes et trois tailles, passer d'un écran à l'autre pour comparer deux
 * prix rendrait toute vérification pénible.
 */
export default function DeliveryTariffPanel() {
  const [zones, setZones] = useState<Zone[]>([])
  const [grid, setGrid] = useState<Record<string, Partial<Record<ParcelSize, string>>>>({})
  const [defaultSize, setDefaultSize] = useState<ParcelSize>(DEFAULT_PARCEL_SIZE)
  const [pickupEnabled, setPickupEnabled] = useState(false)
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupHours, setPickupHours] = useState('')
  const [missingSizes, setMissingSizes] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const [zonesRes, ratesRes, settingsRes, productsRes] = await Promise.all([
      supabase
        .from('shipping_fees')
        .select('id, city, price_fcfa, parent_city, is_active')
        .order('sort_order')
        .order('city'),
      supabase.from('shipping_rates').select('zone_id, parcel_size, price_fcfa'),
      supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['default_parcel_size', 'pickup_enabled', 'pickup_address', 'pickup_hours']),
      supabase.from('products').select('name, parcel_size'),
    ])

    setMissingTable(!!ratesRes.error)

    const list = ((zonesRes.data || []) as Zone[]).filter(z => z.is_active !== false)
    setZones(list)

    const next: Record<string, Partial<Record<ParcelSize, string>>> = {}
    for (const r of ratesRes.data || []) {
      if (!isParcelSize(r.parcel_size)) continue
      next[r.zone_id] = { ...(next[r.zone_id] || {}), [r.parcel_size]: String(r.price_fcfa) }
    }
    setGrid(next)

    const s = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value || '']))
    if (isParcelSize(s.default_parcel_size)) setDefaultSize(s.default_parcel_size)
    setPickupEnabled(s.pickup_enabled === 'true')
    setPickupAddress(s.pickup_address || '')
    setPickupHours(s.pickup_hours || '')

    // Un produit sans taille prend la taille par défaut : si sa taille réelle
    // est supérieure, la livraison coûte plus cher que ce que le client paie.
    setMissingSizes(
      (productsRes.data || [])
        .filter((p: any) => !isParcelSize(p.parcel_size))
        .map((p: any) => p.name)
    )

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const saveGrid = async () => {
    setBusy(true)
    setMessage(null)
    const supabase = getSupabaseClient()

    const rows: { zone_id: string; parcel_size: string; price_fcfa: number }[] = []
    for (const zone of zones) {
      for (const size of PARCEL_SIZES) {
        const raw = grid[zone.id]?.[size]
        if (raw === undefined || raw === '') continue
        const price = Number(raw)
        if (!Number.isFinite(price) || price < 0) {
          setBusy(false)
          setMessage({
            kind: 'ko',
            text: `Prix invalide pour ${zone.city} · ${SIZE_LABELS[size]}.`,
          })
          return
        }
        rows.push({ zone_id: zone.id, parcel_size: size, price_fcfa: Math.round(price) })
      }
    }

    const { error } = await supabase
      .from('shipping_rates')
      .upsert(rows, { onConflict: 'zone_id,parcel_size' })

    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({ kind: 'ok', text: `${rows.length} tarifs enregistrés.` })
  }

  const saveSettings = async () => {
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('site_settings').upsert(
      [
        { key: 'default_parcel_size', value: defaultSize },
        { key: 'pickup_enabled', value: pickupEnabled ? 'true' : 'false' },
        { key: 'pickup_address', value: pickupAddress.trim() || null },
        { key: 'pickup_hours', value: pickupHours.trim() || null },
      ],
      { onConflict: 'key' }
    )
    setBusy(false)
    setMessage(
      error ? { kind: 'ko', text: error.message } : { kind: 'ok', text: 'Réglages enregistrés.' }
    )
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
      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">La grille par taille n’est pas encore installée.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-amber-100 px-1 rounded">
                supabase/migrations/025_delivery_zones.sql
              </code>
              , puis rechargez.
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

      {missingSizes.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">
              {missingSizes.length} produit{missingSizes.length > 1 ? 's n’ont' : ' n’a'} pas de
              taille de colis.
            </p>
            <p className="mt-1">
              {missingSizes.slice(0, 6).join(' · ')}
              {missingSizes.length > 6 && ` … et ${missingSizes.length - 6} autre(s)`}
            </p>
            <p className="mt-1.5 text-[12px]">
              Ils comptent comme « {SIZE_LABELS[defaultSize]} ». Si leur taille réelle est
              supérieure, la livraison vous coûte plus cher que ce que le client paie.
            </p>
          </div>
        </div>
      )}

      <section className={CARD}>
        <div className="p-5 border-b border-[#E8E0D8]">
          <h2 className="font-serif text-lg text-[#241A14]">Tarifs par zone et taille</h2>
          <p className="text-xs text-[#7D6A5D] mt-1">
            Un prix par commune et par taille de colis. Une case vide fait retomber sur le prix
            fixe de la zone.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E0D8]">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#7D6A5D]">
                  Zone
                </th>
                {PARCEL_SIZES.map(size => (
                  <th
                    key={size}
                    className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#7D6A5D] whitespace-nowrap"
                  >
                    {SIZE_LABELS[size]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone.id} className="border-b border-[#F1EBE3] last:border-0">
                  <td className="px-4 py-2 text-sm text-[#241A14] whitespace-nowrap">
                    {zone.city}
                  </td>
                  {PARCEL_SIZES.map(size => (
                    <td key={size} className="px-4 py-2">
                      <input
                        type="number"
                        value={grid[zone.id]?.[size] ?? ''}
                        placeholder={String(zone.price_fcfa)}
                        onChange={e =>
                          setGrid({
                            ...grid,
                            [zone.id]: { ...(grid[zone.id] || {}), [size]: e.target.value },
                          })
                        }
                        className="w-24 px-2 py-1.5 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14] tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[#E8E0D8] flex items-center gap-3">
          <button
            onClick={saveGrid}
            disabled={busy || missingTable}
            className="px-5 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer la grille'}
          </button>
          <span className="text-xs text-[#7D6A5D]">
            Montants en FCFA. Le gris indique le prix fixe actuel de la zone.
          </span>
        </div>
      </section>

      <section className={`${CARD} p-5 space-y-4`}>
        <div>
          <h2 className="font-serif text-lg text-[#241A14]">Taille par défaut et retrait</h2>
          <p className="text-xs text-[#7D6A5D] mt-1">
            Le retrait sur place est la seule option qui échappe au coût du transport. Il devient
            indispensable dès qu’un colis encombrant fait grimper la livraison au-delà de ce qu’un
            client accepte de payer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>TAILLE PAR DÉFAUT</label>
            <select
              value={defaultSize}
              onChange={e => setDefaultSize(e.target.value as ParcelSize)}
              className={INPUT}
            >
              {PARCEL_SIZES.map(s => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#7D6A5D] mt-1">
              Pour un produit dont la taille n’est pas renseignée.
            </p>
          </div>
          <div>
            <label className={LABEL}>HORAIRES DE RETRAIT</label>
            <input
              value={pickupHours}
              onChange={e => setPickupHours(e.target.value)}
              placeholder="Lundi au samedi, 9h – 18h"
              className={INPUT}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>ADRESSE DE RETRAIT</label>
            <input
              value={pickupAddress}
              onChange={e => setPickupAddress(e.target.value)}
              placeholder="Yopougon, …"
              className={INPUT}
            />
            <p className="text-[11px] text-[#7D6A5D] mt-1">
              Sans adresse, l’option de retrait n’est pas proposée au client.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#241A14]">
          <input
            type="checkbox"
            checked={pickupEnabled}
            onChange={e => setPickupEnabled(e.target.checked)}
          />
          Proposer le retrait sur place
        </label>

        <button
          onClick={saveSettings}
          disabled={busy}
          className="px-5 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </section>

      <p className="text-xs text-[#7D6A5D] leading-relaxed">
        Aucun transporteur n’est nommé sur le site : le client voit « Livraison » et un prix. Qui
        porte réellement le colis se décide commande par commande, avec la position du client
        lorsqu’il l’a partagée.
      </p>
    </div>
  )
}
