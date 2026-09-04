'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Link2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/Button'
import { getSupabaseClient } from '@/lib/supabase'
import {
  DEFAULT_HERO_SETTINGS,
  HERO_SETTING_KEYS,
  MAX_INTERVAL_MS,
  MIN_INTERVAL_MS,
  parseHeroSettings,
  type HeroSettings,
  type PromoSlide,
} from '@/lib/hero'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

/**
 * Gestion du bandeau promotionnel de l'accueil.
 *
 * Remplace l'ancienne image unique. On peut désormais en publier plusieurs,
 * les réordonner, leur donner une destination, régler la vitesse de défilement,
 * et couper indépendamment le texte d'accroche et le bandeau — c'est cette
 * dernière bascule qui donne le mode « grande bannière seule ».
 */
export function PromoBannerPanel() {
  const [slides, setSlides] = useState<PromoSlide[]>([])
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  /** Diapositive dont l'image doit être remplacée ; null = ajout. */
  const replacingId = useRef<string | null>(null)

  const flash = (message: string) => {
    setNotice(message)
    setTimeout(() => setNotice(''), 2500)
  }

  const load = async () => {
    try {
      const supabase = getSupabaseClient()
      const [settingsRes, slidesRes] = await Promise.all([
        supabase.from('site_settings').select('key, value').in('key', HERO_SETTING_KEYS as unknown as string[]),
        supabase
          .from('promo_slides')
          .select('id, image_url, link_url, alt_text, sort_order, is_active')
          .order('sort_order', { ascending: true }),
      ])
      if (slidesRes.error) throw slidesRes.error
      setSettings(parseHeroSettings(settingsRes.data))
      setSlides((slidesRes.data as PromoSlide[]) || [])
    } catch (err: any) {
      // PGRST205 : la table n'est pas dans le cache de schéma, donc la
      // migration n'a pas encore été exécutée. Le dire franchement évite de
      // chercher un bug là où il n'y a qu'une étape sautée.
      setError(
        err?.code === 'PGRST205'
          ? "La migration 031 n'a pas encore été exécutée : le bandeau ne peut pas être géré tant que la table promo_slides n'existe pas."
          : err?.message || 'Erreur lors du chargement du bandeau'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSetting = async (key: string, value: string) => {
    const supabase = getSupabaseClient()
    const { error: err } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (err) throw err
  }

  const updateSettings = async (patch: Partial<HeroSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      if (patch.textEnabled !== undefined)
        await saveSetting('hero_text_enabled', String(patch.textEnabled))
      if (patch.carouselEnabled !== undefined)
        await saveSetting('hero_carousel_enabled', String(patch.carouselEnabled))
      if (patch.intervalMs !== undefined)
        await saveSetting('hero_carousel_interval_ms', String(patch.intervalMs))
      flash('Réglage enregistré')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
      setSettings(settings) // on remet l'état précédent, l'écriture a échoué
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetId = replacingId.current
    replacingId.current = null
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return

    setError('')
    if (!file.type.startsWith('image/')) return setError('Le fichier doit être une image')
    if (file.size > MAX_FILE_BYTES) return setError("L'image dépasse 5 Mo")

    setBusy(true)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `banners/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

      if (targetId) {
        const { error: updErr } = await supabase
          .from('promo_slides')
          .update({ image_url: data.publicUrl })
          .eq('id', targetId)
        if (updErr) throw updErr
        flash('Image remplacée')
      } else {
        // Se place en dernier : une nouvelle image ne doit pas passer devant
        // celles déjà en ligne sans qu'on l'ait demandé.
        const nextOrder = slides.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1
        const { error: insErr } = await supabase
          .from('promo_slides')
          .insert([{ image_url: data.publicUrl, sort_order: nextOrder }])
        if (insErr) throw insErr
        flash('Image ajoutée')
      }
      await load()
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi de l'image")
    } finally {
      setBusy(false)
    }
  }

  const removeSlide = async (id: string) => {
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase.from('promo_slides').delete().eq('id', id)
      if (err) throw err
      await load()
      flash('Image supprimée')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setBusy(false)
    }
  }

  /** Échange la position de deux diapositives voisines. */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const a = slides[index]
    const b = slides[target]

    // Mise à jour optimiste : l'ordre bascule immédiatement à l'écran, le
    // rechargement qui suit fait foi.
    const next = [...slides]
    next[index] = b
    next[target] = a
    setSlides(next)

    try {
      const supabase = getSupabaseClient()
      await Promise.all([
        supabase.from('promo_slides').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('promo_slides').update({ sort_order: a.sort_order }).eq('id', b.id),
      ])
      await load()
    } catch (err: any) {
      setError(err.message || 'Erreur lors du réordonnancement')
      await load()
    }
  }

  const updateField = async (id: string, patch: Partial<PromoSlide>) => {
    setSlides(cur => cur.map(s => (s.id === id ? { ...s, ...patch } : s)))
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase.from('promo_slides').update(patch).eq('id', id)
      if (err) throw err
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    }
  }

  const inputCls =
    'w-full px-3 py-2 text-sm bg-bg-raised border border-border-mid rounded-lg text-ink outline-none focus:border-border-strong transition-colors'

  return (
    <div className="bg-bg-panel rounded-lg border border-border p-6">
      <h2 className="font-serif font-semibold text-xl text-ink mb-1">
        Bandeau promotionnel de l&apos;accueil
      </h2>
      <p className="text-sm text-ink-dimmer mb-4">
        Les images défilent en haut de la page d&apos;accueil, dans l&apos;ordre ci-dessous.
        À partir de deux images, des flèches, des pastilles et une jauge de temps
        restant apparaissent automatiquement sur le site.
      </p>

      {/* Dimension exacte attendue. Elle dépend de la disposition choisie plus
          bas : la bannière pleine largeur et la bannière encadrée n'ont pas le
          même rapport, et une image au mauvais rapport laisse des bandes vides
          de chaque côté puisque l'affichage ne recadre jamais. */}
      <div className="border border-border rounded-lg p-4 mb-6 bg-bg-raised">
        <p className="font-semibold text-sm text-ink mb-2">Dimension de l&apos;image</p>
        {settings.textEnabled ? (
          <p className="text-[13px] text-ink-dim leading-relaxed">
            Disposition actuelle : bandeau <strong>à côté du texte d&apos;accroche</strong>.
            Préparez vos images en <strong className="font-mono">1700 × 720 px</strong>{' '}
            (rapport 2,36 : 1).
          </p>
        ) : (
          <p className="text-[13px] text-ink-dim leading-relaxed">
            Disposition actuelle : bandeau <strong>pleine largeur</strong>.
            Préparez vos images en <strong className="font-mono">2000 × 700 px</strong>{' '}
            (rapport 2,86 : 1).
          </p>
        )}
        <p className="text-[12px] text-ink-dimmer mt-2 leading-relaxed">
          L&apos;image est affichée entière, jamais recadrée : c&apos;est ce qui garantit
          que le texte écrit dedans ne sera pas coupé. En contrepartie, un autre rapport
          laisse des bandes vides sur les côtés ou au-dessus. Placez vos mots et votre
          logo au centre : sur téléphone, la zone visible se resserre.
          JPG ou PNG, 5 Mo maximum.
        </p>
      </div>

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

      {/* ── Disposition de la zone d'accueil ───────────────────────────── */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <p className="font-semibold text-sm text-ink mb-1">Disposition</p>
        <p className="text-[13px] text-ink-dimmer mb-4">
          Décocher le texte donne toute la largeur au bandeau — c&apos;est le mode grande
          bannière. Décocher le bandeau rend toute la largeur au texte.
        </p>

        <label className="flex items-start gap-3 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.textEnabled}
            onChange={e => updateSettings({ textEnabled: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-gold"
          />
          <span className="text-sm text-ink">
            Afficher le texte d&apos;accroche
            <span className="block text-[12px] text-ink-dimmer">
              « La performance, sans compromis » et ses deux boutons
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.carouselEnabled}
            onChange={e => updateSettings({ carouselEnabled: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-gold"
          />
          <span className="text-sm text-ink">
            Afficher le bandeau promotionnel
            <span className="block text-[12px] text-ink-dimmer">
              Sans image publiée, le bandeau ne s&apos;affiche pas même s&apos;il est activé
            </span>
          </span>
        </label>

        {!settings.textEnabled && !settings.carouselEnabled && (
          <p className="mt-4 text-[13px] text-danger">
            Les deux blocs sont désactivés : la zone d&apos;accueil n&apos;apparaîtra pas
            du tout, et la page commencera directement par les gammes.
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-border">
          <label className="block text-sm text-ink mb-1.5">
            Durée d&apos;affichage de chaque image
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={MIN_INTERVAL_MS / 1000}
              max={MAX_INTERVAL_MS / 1000}
              step={1}
              value={Math.round(settings.intervalMs / 1000)}
              onChange={e => {
                const seconds = Number(e.target.value)
                if (!Number.isFinite(seconds)) return
                const ms = Math.min(
                  MAX_INTERVAL_MS,
                  Math.max(MIN_INTERVAL_MS, Math.round(seconds * 1000))
                )
                updateSettings({ intervalMs: ms })
              }}
              className={`${inputCls} max-w-[110px]`}
            />
            <span className="text-sm text-ink-dimmer">
              secondes (entre {MIN_INTERVAL_MS / 1000} et {MAX_INTERVAL_MS / 1000})
            </span>
          </div>
          <p className="text-[12px] text-ink-dimmer mt-2">
            Sans effet s&apos;il n&apos;y a qu&apos;une seule image : elle reste affichée.
          </p>
        </div>
      </div>

      {/* ── Images ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-ink-dimmer">Chargement…</p>
      ) : slides.length === 0 ? (
        <div className="aspect-[3/1] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-center px-6">
          <p className="text-sm text-ink-dim">Aucune image publiée</p>
          <p className="text-[13px] text-ink-dimmer mt-1 max-w-sm">
            Tant qu&apos;aucune image n&apos;est ajoutée, la zone reste vide sur le site.
            Rien n&apos;y est affiché à votre place.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {slides.map((slide, i) => (
            <li key={slide.id} className="border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image_url}
                  alt={slide.alt_text || `Image ${i + 1}`}
                  className="w-full sm:w-56 flex-shrink-0 rounded border border-border object-cover aspect-[3/1] bg-bg-sunken"
                />

                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-dim mb-1">
                      Lien au clic (facultatif)
                    </label>
                    <div className="flex items-center gap-2">
                      <Link2 size={15} className="text-ink-dimmer flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="/products?category=gaming"
                        defaultValue={slide.link_url || ''}
                        onBlur={e =>
                          updateField(slide.id, { link_url: e.target.value.trim() || null })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-ink-dim mb-1">
                      Description de l&apos;image
                    </label>
                    <input
                      type="text"
                      placeholder="Ex. : Soldes sur les PC portables"
                      defaultValue={slide.alt_text || ''}
                      onBlur={e =>
                        updateField(slide.id, { alt_text: e.target.value.trim() || null })
                      }
                      className={inputCls}
                    />
                    <p className="text-[11.5px] text-ink-dimmer mt-1">
                      Lue à voix haute par les lecteurs d&apos;écran, et affichée si
                      l&apos;image ne charge pas.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-[13px] text-ink mr-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slide.is_active}
                        onChange={e => updateField(slide.id, { is_active: e.target.checked })}
                        className="w-4 h-4 accent-gold"
                      />
                      Visible
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy}
                      aria-label="Monter cette image"
                    >
                      <ArrowUp size={14} /> Monter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => move(i, 1)}
                      disabled={i === slides.length - 1 || busy}
                      aria-label="Descendre cette image"
                    >
                      <ArrowDown size={14} /> Descendre
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        replacingId.current = slide.id
                        fileRef.current?.click()
                      }}
                      disabled={busy}
                    >
                      <Upload size={14} /> Remplacer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSlide(slide.id)}
                      disabled={busy}
                      className="text-danger"
                    >
                      <Trash2 size={14} /> Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            replacingId.current = null
            fileRef.current?.click()
          }}
          disabled={busy || loading}
        >
          <Upload size={15} /> {busy ? 'Envoi…' : 'Ajouter une image'}
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
