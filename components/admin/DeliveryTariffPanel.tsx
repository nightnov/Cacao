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

interface Zone {
  number: number
  label: string
  localities: string | null
}

interface ParcelSizeRow {
  code: ParcelSize
  label: string
  weight_range: string | null
  dimensions: string | null
  examples: string | null
}

const CARD = 'bg-bg-panel border border-border rounded-2xl'
const INPUT = 'w-full px-3 py-2 border border-border rounded-lg text-sm text-ink'
const LABEL = 'block text-xs font-semibold text-ink-dim mb-1.5'

/**
 * Grille de livraison : un prix par trajet et par taille de colis.
 *
 * Aucun transporteur n'est nommé, ici comme côté client. La grille décrit ce
 * que le client paie, pas qui porte le colis : ce choix se fait commande par
 * commande, en dehors du site.
 *
 * Seuls les trajets partant de la zone d'expédition sont affichés. La grille
 * complète compte vingt et une routes ; n'en montrer que six garde l'écran
 * lisible et empêche de modifier par erreur un tarif sans rapport.
 */
export default function DeliveryTariffPanel() {
  const [zones, setZones] = useState<Zone[]>([])
  const [sizes, setSizes] = useState<ParcelSizeRow[]>([])
  const [pickupZone, setPickupZone] = useState(1)
  const [grid, setGrid] = useState<Record<string, string>>({})
  const [defaultSize, setDefaultSize] = useState<ParcelSize>(DEFAULT_PARCEL_SIZE)
  const [pickupEnabled, setPickupEnabled] = useState(false)
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupHours, setPickupHours] = useState('')
  const [missingSizes, setMissingSizes] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const key = (toZone: number, size: ParcelSize) => `${toZone}:${size}`

  const load = async () => {
    const supabase = getSupabaseClient()
    const [zonesRes, sizesRes, ratesRes, settingsRes, productsRes] = await Promise.all([
      supabase.from('delivery_zones').select('number, label, localities').order('number'),
      supabase.from('parcel_sizes').select('*').order('sort_order'),
      supabase.from('shipping_rates').select('from_zone, to_zone, parcel_size, price_fcfa'),
      supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'default_parcel_size',
          'pickup_zone',
          'pickup_enabled',
          'pickup_address',
          'pickup_hours',
        ]),
      supabase.from('products').select('name, parcel_size'),
    ])

    setMissingTable(!!zonesRes.error || !!ratesRes.error)
    setZones((zonesRes.data || []) as Zone[])
    setSizes((sizesRes.data || []) as ParcelSizeRow[])

    const s = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value || '']))
    const pz = Number(s.pickup_zone)
    const from = Number.isInteger(pz) && pz >= 1 && pz <= 6 ? pz : 1
    setPickupZone(from)
    if (isParcelSize(s.default_parcel_size)) setDefaultSize(s.default_parcel_size)
    setPickupEnabled(s.pickup_enabled === 'true')
    setPickupAddress(s.pickup_address || '')
    setPickupHours(s.pickup_hours || '')

    // Le trajet est retenu dans les deux sens : la grille publiée n'en donne
    // qu'une moitié, le tarif étant le même à l'aller et au retour.
    const next: Record<string, string> = {}
    for (const r of ratesRes.data || []) {
      if (!isParcelSize(r.parcel_size)) continue
      if (r.from_zone === from) next[key(r.to_zone, r.parcel_size)] = String(r.price_fcfa)
      else if (r.to_zone === from) next[key(r.from_zone, r.parcel_size)] = String(r.price_fcfa)
    }
    setGrid(next)

    setMissingSizes(
      (productsRes.data || [])
        .filter((p: any) => !isParcelSize(p.parcel_size))
        .map((p: any) => p.name)
    )

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveGrid = async () => {
    setBusy(true)
    setMessage(null)
    const supabase = getSupabaseClient()

    const rows: { from_zone: number; to_zone: number; parcel_size: string; price_fcfa: number }[] =
      []

    for (const zone of zones) {
      for (const size of PARCEL_SIZES) {
        const raw = grid[key(zone.number, size)]
        if (raw === undefined || raw === '') continue
        const price = Number(raw)
        if (!Number.isFinite(price) || price < 0) {
          setBusy(false)
          setMessage({
            kind: 'ko',
            text: `Prix invalide pour ${zone.label} · ${SIZE_LABELS[size]}.`,
          })
          return
        }
        // La ligne est écrite dans le sens publié — zone basse vers zone haute —
        // pour ne pas créer un doublon qui contredirait celle déjà en base.
        rows.push({
          from_zone: Math.min(pickupZone, zone.number),
          to_zone: Math.max(pickupZone, zone.number),
          parcel_size: size,
          price_fcfa: Math.round(price),
        })
      }
    }

    const { error } = await supabase
      .from('shipping_rates')
      .upsert(rows, { onConflict: 'from_zone,to_zone,parcel_size' })

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
        { key: 'pickup_zone', value: String(pickupZone) },
        { key: 'pickup_enabled', value: pickupEnabled ? 'true' : 'false' },
        { key: 'pickup_address', value: pickupAddress.trim() || null },
        { key: 'pickup_hours', value: pickupHours.trim() || null },
      ],
      { onConflict: 'key' }
    )
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({ kind: 'ok', text: 'Réglages enregistrés.' })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-dim text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {missingTable && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold">
            <p className="font-semibold">La grille de livraison n’est pas encore installée.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-gold/15 px-1 rounded">
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
              ? 'bg-green/10 border-green/30 text-green-bright'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      {missingSizes.length > 0 && (
        <div className="bg-danger/10 border border-danger/40 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-danger">
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

      {/* ── Repères de taille ────────────────────────────────────────────── */}
      {sizes.length > 0 && (
        <section className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-ink mb-1">Tailles de colis</h2>
          <p className="text-xs text-ink-dimmer mb-4">
            Repères pour classer un produit. Un article qui dépasse une boîte passe à la taille
            au-dessus.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sizes.map(s => (
              <div key={s.code} className="border border-border rounded-xl p-3.5">
                <p className="font-semibold text-sm text-ink">{s.label}</p>
                {s.weight_range && (
                  <p className="text-[12px] text-ink-dimmer mt-0.5">{s.weight_range}</p>
                )}
                {s.dimensions && (
                  <p className="text-[12px] text-ink mt-1.5">{s.dimensions}</p>
                )}
                {s.examples && (
                  <p className="text-[11px] text-ink-dimmer mt-1">{s.examples}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Grille ───────────────────────────────────────────────────────── */}
      <section className={CARD}>
        <div className="p-5 border-b border-border">
          <h2 className="font-serif text-lg text-ink">Tarifs de livraison</h2>
          <p className="text-xs text-ink-dimmer mt-1">
            Prix par zone de destination et par taille de colis, au départ de la{' '}
            <strong>zone {pickupZone}</strong>. Une case vide fait retomber sur le prix fixe de la
            localité.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-ink-dimmer">
                  Destination
                </th>
                {PARCEL_SIZES.map(size => (
                  <th
                    key={size}
                    className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-ink-dimmer whitespace-nowrap"
                  >
                    {SIZE_LABELS[size]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone.number} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="text-sm text-ink whitespace-nowrap">{zone.label}</p>
                    {zone.localities && (
                      <p className="text-[11px] text-ink-dimmer max-w-md truncate">
                        {zone.localities}
                      </p>
                    )}
                  </td>
                  {PARCEL_SIZES.map(size => (
                    <td key={size} className="px-4 py-2.5">
                      <input
                        type="number"
                        value={grid[key(zone.number, size)] ?? ''}
                        onChange={e =>
                          setGrid({ ...grid, [key(zone.number, size)]: e.target.value })
                        }
                        className="w-24 px-2 py-1.5 border border-border rounded-lg text-sm text-ink tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center gap-3">
          <button
            onClick={saveGrid}
            disabled={busy || missingTable}
            className="px-5 py-2 bg-gold hover:bg-gold-dim disabled:opacity-50 text-ink-invert rounded-lg font-semibold text-sm"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer la grille'}
          </button>
          <span className="text-xs text-ink-dimmer">Montants en FCFA.</span>
        </div>
      </section>

      {/* ── Réglages ─────────────────────────────────────────────────────── */}
      <section className={`${CARD} p-5 space-y-4`}>
        <div>
          <h2 className="font-serif text-lg text-ink">Expédition et retrait</h2>
          <p className="text-xs text-ink-dimmer mt-1">
            Le retrait sur place est la seule option qui échappe au coût du transport. Il devient
            utile dès qu’un grand colis fait grimper la livraison au-delà de ce qu’un client
            accepte de payer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>ZONE D’EXPÉDITION</label>
            <select
              value={pickupZone}
              onChange={e => setPickupZone(Number(e.target.value))}
              className={INPUT}
            >
              {zones.map(z => (
                <option key={z.number} value={z.number}>
                  {z.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-dimmer mt-1">
              La zone d’où partent vos colis. Elle détermine toute la grille.
            </p>
          </div>
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
            <p className="text-[11px] text-ink-dimmer mt-1">
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
          <div>
            <label className={LABEL}>ADRESSE DE RETRAIT</label>
            <input
              value={pickupAddress}
              onChange={e => setPickupAddress(e.target.value)}
              placeholder="Yopougon, …"
              className={INPUT}
            />
            <p className="text-[11px] text-ink-dimmer mt-1">
              Sans adresse, l’option de retrait n’est pas proposée.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
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
          className="px-5 py-2 bg-gold hover:bg-gold-dim disabled:opacity-50 text-ink-invert rounded-lg font-semibold text-sm"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </section>

      <p className="text-xs text-ink-dimmer leading-relaxed">
        Aucun transporteur n’est nommé sur le site : le client voit « Livraison » et un prix. Qui
        porte réellement le colis se décide commande par commande, avec la position du client
        lorsqu’il l’a partagée.
      </p>
    </div>
  )
}
