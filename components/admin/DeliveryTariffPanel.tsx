'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, LocateFixed, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  DEFAULT_TARIFF,
  quoteDelivery,
  haversineKm,
  type DeliveryTariff,
} from '@/lib/delivery'
import { formatAmount } from '@/lib/format'

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'
const LABEL = 'block text-xs font-semibold text-[#5B4B41] mb-1.5'

const KEYS = [
  'pickup_lat',
  'pickup_lng',
  'delivery_base_fcfa',
  'delivery_per_km_fcfa',
  'delivery_road_factor',
  'delivery_min_fcfa',
  'delivery_max_fcfa',
]

/**
 * Grille de tarification à la distance.
 *
 * Yango facture au trajet parcouru ; tant que son API n'est pas branchée, le
 * prix est reconstitué ici à partir de la distance entre le point de retrait
 * et le client.
 */
export default function DeliveryTariffPanel() {
  const [tariff, setTariff] = useState<DeliveryTariff>(DEFAULT_TARIFF)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [missing, setMissing] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', KEYS)

      if (error || !(data || []).some(r => r.key === 'delivery_base_fcfa')) setMissing(true)

      const s = Object.fromEntries((data || []).map(r => [r.key, r.value]))
      const num = (v: unknown, f: number) => (Number.isFinite(Number(v)) ? Number(v) : f)
      setTariff({
        pickupLat: s.pickup_lat ? num(s.pickup_lat, NaN) : null,
        pickupLng: s.pickup_lng ? num(s.pickup_lng, NaN) : null,
        baseFcfa: num(s.delivery_base_fcfa, DEFAULT_TARIFF.baseFcfa),
        perKmFcfa: num(s.delivery_per_km_fcfa, DEFAULT_TARIFF.perKmFcfa),
        roadFactor: num(s.delivery_road_factor, DEFAULT_TARIFF.roadFactor),
        minFcfa: num(s.delivery_min_fcfa, DEFAULT_TARIFF.minFcfa),
        maxFcfa: num(s.delivery_max_fcfa, DEFAULT_TARIFF.maxFcfa),
      })
      setLoading(false)
    }
    load()
  }, [])

  const useMyPosition = () => {
    if (!('geolocation' in navigator)) {
      setMessage({ kind: 'ko', text: 'Ce navigateur ne sait pas donner de position.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        setTariff(t => ({
          ...t,
          pickupLat: Number(pos.coords.latitude.toFixed(6)),
          pickupLng: Number(pos.coords.longitude.toFixed(6)),
        }))
        setMessage({
          kind: 'ok',
          text: `Point relevé à ${Math.round(pos.coords.accuracy)} m près. Enregistrez pour l'appliquer.`,
        })
      },
      () => {
        setLocating(false)
        setMessage({
          kind: 'ko',
          text: 'Position refusée ou indisponible. Saisissez les coordonnées à la main.',
        })
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const save = async () => {
    if (tariff.minFcfa > tariff.maxFcfa) {
      setMessage({ kind: 'ko', text: 'Le plancher dépasse le plafond.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('site_settings').upsert(
      [
        { key: 'pickup_lat', value: tariff.pickupLat?.toString() ?? null },
        { key: 'pickup_lng', value: tariff.pickupLng?.toString() ?? null },
        { key: 'delivery_base_fcfa', value: String(Math.round(tariff.baseFcfa)) },
        { key: 'delivery_per_km_fcfa', value: String(Math.round(tariff.perKmFcfa)) },
        { key: 'delivery_road_factor', value: String(tariff.roadFactor) },
        { key: 'delivery_min_fcfa', value: String(Math.round(tariff.minFcfa)) },
        { key: 'delivery_max_fcfa', value: String(Math.round(tariff.maxFcfa)) },
      ],
      { onConflict: 'key' }
    )
    setSaving(false)
    setMessage(
      error
        ? { kind: 'ko', text: error.message }
        : { kind: 'ok', text: 'Grille enregistrée.' }
    )
  }

  const hasPickup = tariff.pickupLat !== null && tariff.pickupLng !== null

  // Aperçu sur des distances rondes : ce que paiera réellement un client.
  const preview = [2, 5, 10, 20].map(km => {
    // On fabrique un point fictif à la bonne distance pour passer par le même
    // calcul que la boutique, plutôt que de refaire la formule à côté.
    const fake = hasPickup
      ? { lat: (tariff.pickupLat as number) + km / tariff.roadFactor / 111, lng: tariff.pickupLng as number }
      : null
    const q = quoteDelivery(tariff, fake, null)
    return { km, fcfa: q.fcfa, capped: q.capped }
  })

  if (loading) {
    return (
      <div className={`${CARD} p-5 flex items-center gap-2 text-sm text-[#5B4B41]`}>
        <Loader2 size={15} className="animate-spin" /> Chargement…
      </div>
    )
  }

  return (
    <section className={`${CARD} p-5`}>
      <h2 className="font-serif text-lg text-[#241A14]">Tarification à la distance</h2>
      <p className="text-xs text-[#7D6A5D] mt-1 mb-4">
        Quand le client partage sa position, le prix est calculé sur le trajet depuis votre point de
        retrait — comme le fait Yango. Sinon, le tarif fixe de sa commune s’applique.
      </p>

      {missing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Exécutez{' '}
            <code className="bg-amber-100 px-1 rounded">
              supabase/migrations/025_delivery_zones.sql
            </code>{' '}
            pour activer ce calcul et ajouter les communes d’Abidjan.
          </p>
        </div>
      )}

      {!hasPickup && !missing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong>Point de retrait non défini.</strong> Sans lui, aucune distance ne peut être
            calculée et tous les clients paient le tarif de leur commune. Relevez-le depuis un
            téléphone, sur place.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`rounded-xl px-3.5 py-2.5 mb-4 text-sm border ${
            message.kind === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-5">
        <label className={LABEL}>POINT DE RETRAIT (D’OÙ PART LE LIVREUR)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={tariff.pickupLat ?? ''}
            onChange={e =>
              setTariff({ ...tariff, pickupLat: e.target.value === '' ? null : Number(e.target.value) })
            }
            placeholder="Latitude"
            className={`${INPUT} w-40`}
          />
          <input
            value={tariff.pickupLng ?? ''}
            onChange={e =>
              setTariff({ ...tariff, pickupLng: e.target.value === '' ? null : Number(e.target.value) })
            }
            placeholder="Longitude"
            className={`${INPUT} w-40`}
          />
          <button
            onClick={useMyPosition}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E8E0D8] hover:bg-gray-50 disabled:opacity-50 text-[#241A14] rounded-lg font-semibold text-xs"
          >
            <LocateFixed size={14} className="text-[#C2410C]" />
            {locating ? 'Relevé…' : 'Je suis ici'}
          </button>
          {hasPickup && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${tariff.pickupLat},${tariff.pickupLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#C2410C] hover:underline"
            >
              Vérifier sur la carte
            </a>
          )}
        </div>
        <p className="text-[11px] text-[#7D6A5D] mt-1.5">
          À relever depuis le lieu de retrait lui-même, avec un téléphone : c’est là que la position
          est la plus juste.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>PRISE EN CHARGE (FCFA)</label>
          <input
            type="number"
            value={tariff.baseFcfa}
            onChange={e => setTariff({ ...tariff, baseFcfa: Number(e.target.value) })}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>PRIX AU KILOMÈTRE</label>
          <input
            type="number"
            value={tariff.perKmFcfa}
            onChange={e => setTariff({ ...tariff, perKmFcfa: Number(e.target.value) })}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>COEFFICIENT DE ROUTE</label>
          <input
            type="number"
            step="0.1"
            value={tariff.roadFactor}
            onChange={e => setTariff({ ...tariff, roadFactor: Number(e.target.value) })}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>PLANCHER (FCFA)</label>
          <input
            type="number"
            value={tariff.minFcfa}
            onChange={e => setTariff({ ...tariff, minFcfa: Number(e.target.value) })}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>PLAFOND (FCFA)</label>
          <input
            type="number"
            value={tariff.maxFcfa}
            onChange={e => setTariff({ ...tariff, maxFcfa: Number(e.target.value) })}
            className={INPUT}
          />
        </div>
      </div>

      <p className="text-[11px] text-[#7D6A5D] mt-2 leading-relaxed">
        Le <strong>coefficient de route</strong> corrige l’écart entre la distance à vol d’oiseau et
        le trajet réel — ponts, sens uniques, contournement de la lagune. 1,4 est un point de
        départ ; comparez avec vos vraies courses Yango et ajustez.
      </p>

      {hasPickup && (
        <div className="mt-4 pt-4 border-t border-[#E8E0D8]">
          <p className={LABEL}>CE QUE PAIERA LE CLIENT</p>
          <div className="flex flex-wrap gap-2">
            {preview.map(p => (
              <span
                key={p.km}
                className="px-3 py-1.5 bg-gray-50 border border-[#E8E0D8] rounded-lg text-xs text-[#241A14] tabular-nums"
              >
                {p.km} km → <strong>{formatAmount(p.fcfa)}</strong>
                {p.capped && <span className="text-[#7D6A5D]"> (plafond)</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 flex items-center gap-2 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-xl font-semibold text-sm"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Enregistrer la grille
      </button>
    </section>
  )
}
