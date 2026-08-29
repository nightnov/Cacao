'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { priceForWeight, formatKg, DEFAULT_WEIGHT_KG, type WeightBracket } from '@/lib/delivery'
import { formatAmount } from '@/lib/format'

interface Zone {
  id: string
  city: string
  price_fcfa: number
  parent_city: string | null
  is_active: boolean
}

interface Rate extends WeightBracket {
  id?: string
  zone_id: string
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'
const LABEL = 'block text-xs font-semibold text-[#5B4B41] mb-1.5'

/**
 * Grille de livraison : tranches de poids par zone, poids par défaut, retrait.
 *
 * Aucun transporteur n'est nommé, ici comme côté client. La grille décrit ce
 * que le client paie, pas qui porte le colis : ce choix se fait commande par
 * commande, en dehors du site.
 */
export default function DeliveryTariffPanel() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [rates, setRates] = useState<Rate[]>([])
  const [defaultWeight, setDefaultWeight] = useState(String(DEFAULT_WEIGHT_KG))
  const [pickupEnabled, setPickupEnabled] = useState(false)
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupHours, setPickupHours] = useState('')
  const [missingWeights, setMissingWeights] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const [zonesRes, settingsRes, productsRes] = await Promise.all([
        supabase.from('shipping_fees').select('id, city, price_fcfa, parent_city, is_active'),
        supabase
          .from('site_settings')
          .select('key, value')
          .in('key', ['default_weight_kg', 'pickup_enabled', 'pickup_address', 'pickup_hours']),
        supabase.from('products').select('name, weight_kg'),
      ])

      setMissingTable(!!zonesRes.error)

      const list = ((zonesRes.data || []) as Zone[]).filter(z => z.is_active !== false)
      setZones(list)
      if (list.length) setZoneId(prev => prev || list[0].id)

      const s = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value || '']))
      setDefaultWeight(s.default_weight_kg || String(DEFAULT_WEIGHT_KG))
      setPickupEnabled(s.pickup_enabled === 'true')
      setPickupAddress(s.pickup_address || '')
      setPickupHours(s.pickup_hours || '')

      // Un produit sans poids tombe dans la tranche la moins chère : la
      // livraison serait sous-facturée sans que rien ne le signale.
      setMissingWeights(
        (productsRes.data || [])
          .filter((p: any) => p.weight_kg == null || Number(p.weight_kg) <= 0)
          .map((p: any) => p.name)
      )

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!zoneId) return
    const loadRates = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('id, zone_id, max_weight_kg, price_fcfa, extra_per_kg_fcfa')
        .eq('zone_id', zoneId)

      if (error) {
        setRates([])
        return
      }
      setRates(
        (data || [])
          .map(r => ({
            id: r.id,
            zone_id: r.zone_id,
            maxKg: r.max_weight_kg === null ? null : Number(r.max_weight_kg),
            priceFcfa: r.price_fcfa,
            extraPerKgFcfa: r.extra_per_kg_fcfa,
          }))
          .sort((a, b) => {
            if (a.maxKg === null) return 1
            if (b.maxKg === null) return -1
            return a.maxKg - b.maxKg
          })
      )
    }
    loadRates()
  }, [zoneId])

  /** Aperçu : ce que paieraient quelques colis types avec la grille courante. */
  const preview = useMemo(
    () => [1, 3, 5, 10, 25, 40].map(kg => ({ kg, priced: priceForWeight(rates, kg) })),
    [rates]
  )

  const saveRate = async (rate: Rate) => {
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('shipping_rates').upsert({
      ...(rate.id ? { id: rate.id } : {}),
      zone_id: rate.zone_id,
      max_weight_kg: rate.maxKg,
      price_fcfa: Math.max(0, Math.round(rate.priceFcfa) || 0),
      extra_per_kg_fcfa: Math.max(0, Math.round(rate.extraPerKgFcfa) || 0),
    })
    setBusy(false)
    setMessage(
      error ? { kind: 'ko', text: error.message } : { kind: 'ok', text: 'Tranche enregistrée.' }
    )
  }

  const removeRate = async (rate: Rate) => {
    if (!rate.id) {
      setRates(rates.filter(r => r !== rate))
      return
    }
    setBusy(true)
    const supabase = getSupabaseClient()
    await supabase.from('shipping_rates').delete().eq('id', rate.id)
    setBusy(false)
    setRates(rates.filter(r => r.id !== rate.id))
  }

  const addRate = () => {
    setRates([...rates, { zone_id: zoneId, maxKg: 10, priceFcfa: 5000, extraPerKgFcfa: 0 }])
  }

  const saveSettings = async () => {
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('site_settings').upsert(
      [
        { key: 'default_weight_kg', value: defaultWeight.trim() || String(DEFAULT_WEIGHT_KG) },
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

  const zone = zones.find(z => z.id === zoneId)

  return (
    <div className="space-y-6">
      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">La grille au poids n’est pas encore installée.</p>
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

      {missingWeights.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">
              {missingWeights.length} produit{missingWeights.length > 1 ? 's n’ont' : ' n’a'} pas de
              poids renseigné.
            </p>
            <p className="mt-1">
              {missingWeights.slice(0, 6).join(' · ')}
              {missingWeights.length > 6 && ` … et ${missingWeights.length - 6} autre(s)`}
            </p>
            <p className="mt-1.5 text-[12px]">
              Ils comptent pour {defaultWeight} kg. Si leur poids réel est supérieur, la livraison
              vous coûte plus cher que ce que le client paie.
            </p>
          </div>
        </div>
      )}

      <section className={CARD}>
        <div className="p-5 border-b border-[#E8E0D8]">
          <h2 className="font-serif text-lg text-[#241A14]">Tarifs au poids</h2>
          <p className="text-xs text-[#7D6A5D] mt-1">
            Le prix dépend du poids du colis et de la zone. La tranche retenue est la première dont
            la limite couvre le poids du panier.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={LABEL}>ZONE</label>
            <select value={zoneId} onChange={e => setZoneId(e.target.value)} className={INPUT}>
              {zones.map(z => (
                <option key={z.id} value={z.id}>
                  {z.city}
                </option>
              ))}
            </select>
          </div>

          {rates.length === 0 ? (
            <p className="text-sm text-[#7D6A5D]">
              Aucune tranche pour cette zone. Le prix fixe de{' '}
              {formatAmount(zone?.price_fcfa ?? 0)} FCFA s’applique.
            </p>
          ) : (
            <div className="space-y-2">
              {rates.map((r, i) => (
                <div
                  key={r.id || `n${i}`}
                  className="flex flex-wrap items-end gap-3 p-3 border border-[#E8E0D8] rounded-lg"
                >
                  <div className="w-32">
                    <label className={LABEL}>JUSQU’À (KG)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={r.maxKg ?? ''}
                      placeholder="Sans limite"
                      onChange={e => {
                        const v = e.target.value
                        setRates(
                          rates.map((x, j) =>
                            j === i ? { ...x, maxKg: v === '' ? null : Number(v) } : x
                          )
                        )
                      }}
                      className={INPUT}
                    />
                  </div>
                  <div className="w-32">
                    <label className={LABEL}>PRIX (FCFA)</label>
                    <input
                      type="number"
                      value={r.priceFcfa}
                      onChange={e =>
                        setRates(
                          rates.map((x, j) =>
                            j === i ? { ...x, priceFcfa: Number(e.target.value) } : x
                          )
                        )
                      }
                      className={INPUT}
                    />
                  </div>
                  {r.maxKg === null && (
                    <div className="w-36">
                      <label className={LABEL}>PAR KG EN PLUS</label>
                      <input
                        type="number"
                        value={r.extraPerKgFcfa}
                        onChange={e =>
                          setRates(
                            rates.map((x, j) =>
                              j === i ? { ...x, extraPerKgFcfa: Number(e.target.value) } : x
                            )
                          )
                        }
                        className={INPUT}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => saveRate(r)}
                    disabled={busy}
                    className="px-3 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-lg font-semibold text-xs"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => removeRate(r)}
                    disabled={busy}
                    className="ml-auto p-2 text-red-700 hover:bg-red-50 rounded-lg"
                    aria-label="Supprimer la tranche"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addRate}
            disabled={busy || !zoneId}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#C2410C] hover:underline"
          >
            <Plus size={15} /> Ajouter une tranche
          </button>

          {rates.length > 0 && (
            <div className="bg-gray-50 border border-[#E8E0D8] rounded-lg p-3.5">
              <p className="text-xs font-semibold text-[#5B4B41] mb-2">Aperçu pour {zone?.city}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#241A14]">
                {preview.map(p => (
                  <span key={p.kg} className="tabular-nums">
                    {formatKg(p.kg)} →{' '}
                    <strong>{p.priced ? `${formatAmount(p.priced.fcfa)} FCFA` : '—'}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={`${CARD} p-5 space-y-4`}>
        <div>
          <h2 className="font-serif text-lg text-[#241A14]">Poids par défaut et retrait</h2>
          <p className="text-xs text-[#7D6A5D] mt-1">
            Le retrait sur place est la seule option qui échappe au coût du transport. Il devient
            indispensable dès qu’un colis lourd fait grimper la livraison au-delà de ce qu’un client
            accepte de payer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>POIDS PAR DÉFAUT (KG)</label>
            <input
              type="number"
              step="0.5"
              value={defaultWeight}
              onChange={e => setDefaultWeight(e.target.value)}
              className={INPUT}
            />
            <p className="text-[11px] text-[#7D6A5D] mt-1">
              Utilisé pour un produit dont le poids n’est pas renseigné.
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
