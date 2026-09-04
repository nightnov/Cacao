'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  TOKEN_GROUPS,
  TOKEN_KEYS,
  TOKEN_LABELS,
  DEFAULT_TOKENS,
  DEFAULT_THEME_SLUG,
  DEFAULT_THEME_NAME,
  contrastRatio,
  isValidHex,
  type TokenKey,
  type Tokens,
} from '@/lib/theme'
import { AlertTriangle, Check, Loader2, Plus, Trash2, CalendarClock } from 'lucide-react'

interface Theme {
  slug: string
  name: string
  tokens: Tokens
  is_builtin: boolean
  starts_on: string | null
  ends_on: string | null
}

/**
 * Paires que le visiteur lit vraiment, et seuil applicable.
 *
 * 4.5:1 est le minimum WCAG AA pour du texte courant. Les gros titres et les
 * traits décoratifs n'ont pas besoin d'y arriver : les vérifier ferait crier au
 * loup sur des combinaisons parfaitement lisibles. On ne contrôle donc que ce
 * qui porte du texte.
 */
const CONTRAST_CHECKS: { fg: TokenKey; bg: TokenKey; label: string; min: number }[] = [
  { fg: 'ink', bg: 'bg', label: 'Texte principal sur le fond', min: 4.5 },
  { fg: 'ink-dim', bg: 'bg', label: 'Texte secondaire sur le fond', min: 4.5 },
  { fg: 'ink-dimmer', bg: 'bg', label: 'Texte discret sur le fond', min: 4.5 },
  { fg: 'ink', bg: 'bg-panel', label: 'Texte principal sur une carte', min: 4.5 },
  { fg: 'ink-dimmer', bg: 'bg-panel', label: 'Texte discret sur une carte', min: 4.5 },
  { fg: 'ink', bg: 'bg-raised', label: 'Texte dans un champ de saisie', min: 4.5 },

  // Couleur commerciale : elle porte les prix, donc l'information la plus
  // consultée du site. On la vérifie sur la carte et pas seulement sur le
  // fond, parce qu'un prix se lit presque toujours à l'intérieur d'une carte.
  { fg: 'accent', bg: 'bg-panel', label: 'Prix sur une carte', min: 4.5 },
  { fg: 'accent', bg: 'bg', label: 'Liens importants sur le fond', min: 4.5 },
  { fg: 'ink-invert', bg: 'action', label: 'Texte sur le bouton principal', min: 4.5 },

  // Les accents de rayon habillent les boutons de gamme : le libellé posé
  // dessus doit rester lisible, sinon « Découvrir Gaming » disparaît.
  { fg: 'ink-invert', bg: 'cat-portable', label: 'Texte sur le bouton Portables', min: 4.5 },
  { fg: 'ink-invert', bg: 'cat-bureau', label: 'Texte sur le bouton Bureau', min: 4.5 },
  { fg: 'ink-invert', bg: 'cat-gaming', label: 'Texte sur le bouton Gaming', min: 4.5 },
  { fg: 'ink-invert', bg: 'cat-accessoire', label: 'Texte sur le bouton Accessoires', min: 4.5 },

  { fg: 'ink-invert', bg: 'gold', label: 'Texte sur un badge de promotion', min: 4.5 },
]

const CARD = 'bg-bg-panel border border-border rounded-2xl'
const LABEL = 'block text-xs font-semibold text-ink-dim mb-1.5'

export default function AdminAppearance() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeSlug, setActiveSlug] = useState(DEFAULT_THEME_SLUG)
  const [editingSlug, setEditingSlug] = useState(DEFAULT_THEME_SLUG)
  const [draft, setDraft] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const [missingTable, setMissingTable] = useState(false)

  const load = async () => {
    const supabase = getSupabaseClient()
    const [themesRes, settingRes] = await Promise.all([
      supabase.from('site_themes').select('*').order('sort_order'),
      supabase.from('site_settings').select('value').eq('key', 'active_theme').maybeSingle(),
    ])

    // Sans la migration 019, la table n'existe pas. Mieux vaut le dire que
    // d'afficher une page vide qui laisse croire à un bug.
    setMissingTable(!!themesRes.error)

    const list = (themesRes.data || []) as Theme[]
    setThemes(list)
    setActiveSlug(settingRes.data?.value || DEFAULT_THEME_SLUG)
    setLoading(false)
    return list
  }

  useEffect(() => {
    load().then(list => {
      const first = list.find(t => t.slug === DEFAULT_THEME_SLUG) || list[0]
      if (first) {
        setEditingSlug(first.slug)
        setDraft(structuredClone(first))
      }
    })
  }, [])

  const selectTheme = (slug: string) => {
    const t = themes.find(x => x.slug === slug)
    if (!t) return
    setEditingSlug(slug)
    setDraft(structuredClone(t))
    setMessage(null)
  }

  /** Le thème réellement affiché aujourd'hui : une période programmée l'emporte. */
  const appliedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const scheduled = themes
      .filter(t => t.starts_on && t.ends_on && t.starts_on <= today && t.ends_on >= today)
      .sort((a, b) => (b.starts_on || '').localeCompare(a.starts_on || ''))[0]
    return scheduled?.slug || activeSlug
  }, [themes, activeSlug])

  /** Tokens complétés par la palette par défaut, pour ne jamais calculer sur du vide. */
  const tokens = useMemo(() => {
    const t = { ...DEFAULT_TOKENS, ...(draft?.tokens || {}) }
    return t as Record<TokenKey, string>
  }, [draft])

  const failures = useMemo(
    () =>
      CONTRAST_CHECKS.map(c => ({ ...c, ratio: contrastRatio(tokens[c.fg], tokens[c.bg]) })).filter(
        c => c.ratio < c.min
      ),
    [tokens]
  )

  const setToken = (key: TokenKey, value: string) => {
    setDraft(d => (d ? { ...d, tokens: { ...d.tokens, [key]: value.toUpperCase() } } : d))
  }

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true)
    setMessage(null)
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token || ''}`,
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Échec de l’enregistrement.')
      await load()
      return true
    } catch (err: any) {
      setMessage({ kind: 'ko', text: err.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!draft) return
    const bad = TOKEN_KEYS.filter(k => !isValidHex(draft.tokens[k] || DEFAULT_TOKENS[k]))
    if (bad.length) {
      setMessage({ kind: 'ko', text: `Couleur mal formée : ${bad.map(b => TOKEN_LABELS[b]).join(', ')}` })
      return
    }
    const ok = await call({
      action: 'save',
      slug: draft.slug,
      name: draft.name,
      tokens: { ...DEFAULT_TOKENS, ...draft.tokens },
      starts_on: draft.starts_on || null,
      ends_on: draft.ends_on || null,
    })
    if (ok) setMessage({ kind: 'ok', text: 'Thème enregistré. Le site est à jour.' })
  }

  const activate = async () => {
    if (!draft) return
    const ok = await call({ action: 'activate', slug: draft.slug })
    if (ok) setMessage({ kind: 'ok', text: `« ${draft.name} » est maintenant le thème du site.` })
  }

  const remove = async () => {
    if (!draft || draft.is_builtin) return
    if (!confirm(`Supprimer le thème « ${draft.name} » ? Cette action est définitive.`)) return
    const ok = await call({ action: 'delete', slug: draft.slug })
    if (ok) {
      setMessage({ kind: 'ok', text: 'Thème supprimé.' })
      selectTheme(DEFAULT_THEME_SLUG)
    }
  }

  const duplicate = () => {
    if (!draft) return
    const base = prompt('Nom du nouveau thème ?', `${draft.name} (copie)`)
    if (!base) return
    const slug =
      base
        .toLowerCase()
        // « Noël » → « noel » : on sépare les accents de leur lettre puis on les
        // retire, sinon ils deviendraient des tirets dans l'identifiant.
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || `theme-${Date.now()}`

    if (themes.some(t => t.slug === slug)) {
      setMessage({ kind: 'ko', text: 'Un thème porte déjà ce nom.' })
      return
    }
    setDraft({
      slug,
      name: base,
      tokens: { ...tokens },
      is_builtin: false,
      starts_on: null,
      ends_on: null,
    })
    setEditingSlug(slug)
    setMessage({ kind: 'ok', text: 'Thème créé en local. Cliquez sur « Enregistrer » pour le conserver.' })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-dim text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    )
  }

  const isNew = !themes.some(t => t.slug === editingSlug)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-ink">Apparence</h1>
        <p className="text-sm text-ink-dimmer mt-1">
          Les couleurs de la boutique. Vous pouvez aussi programmer un habillage saisonnier qui
          s’installe et se retire tout seul.
        </p>
      </div>

      {missingTable && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold">
            <p className="font-semibold">La table des thèmes n’existe pas encore.</p>
            <p className="mt-1">
              Ouvrez l’éditeur SQL de Supabase et exécutez le fichier{' '}
              <code className="bg-gold/15 px-1 rounded">
                supabase/migrations/019_site_themes.sql
              </code>
              , puis rechargez cette page. En attendant, la boutique s’affiche avec le thème
              «&nbsp;{DEFAULT_THEME_NAME}&nbsp;».
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

      {/* ── Choix du thème ──────────────────────────────────────────────── */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-serif text-lg text-ink">Thèmes</h2>
            <p className="text-xs text-ink-dimmer mt-0.5">
              Actuellement affiché sur le site :{' '}
              <strong className="text-ink">
                {themes.find(t => t.slug === appliedToday)?.name || DEFAULT_THEME_NAME}
              </strong>
              {appliedToday !== activeSlug && ' (période programmée en cours)'}
            </p>
          </div>
          <button
            onClick={duplicate}
            className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline whitespace-nowrap"
          >
            <Plus size={15} /> Créer à partir de celui-ci
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...themes, ...(isNew && draft ? [draft] : [])].map(t => {
            const tk = { ...DEFAULT_TOKENS, ...t.tokens }
            const selected = t.slug === editingSlug
            return (
              <button
                key={t.slug}
                onClick={() => (isNew && t.slug === draft?.slug ? null : selectTheme(t.slug))}
                className={`text-left rounded-xl border-2 overflow-hidden transition-colors ${
                  selected ? 'border-gold' : 'border-border hover:border-border-strong'
                }`}
              >
                <div className="h-16 flex" style={{ background: tk.bg }}>
                  <span className="w-1/4 m-2 rounded" style={{ background: tk['bg-panel'] }} />
                  <span className="w-1/4 my-2 rounded" style={{ background: tk.gold }} />
                  <span className="w-1/4 m-2 rounded" style={{ background: tk.ink }} />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold text-ink truncate">{t.name}</p>
                  <p className="text-[10px] text-ink-dimmer mt-0.5">
                    {t.slug === appliedToday
                      ? 'Affiché sur le site'
                      : t.starts_on
                        ? `${t.starts_on.slice(8)}/${t.starts_on.slice(5, 7)} → ${t.ends_on?.slice(8)}/${t.ends_on?.slice(5, 7)}`
                        : t.slug === activeSlug
                          ? 'Thème par défaut'
                          : ' '}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {draft && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),340px] gap-6 items-start">
          <div className="space-y-6">
            {/* ── Contrôle de lisibilité ───────────────────────────────── */}
            {failures.length > 0 && (
              <div className="bg-gold/10 border border-gold/30 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={17} className="text-gold flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gold">
                    <p className="font-semibold">
                      {failures.length === 1
                        ? 'Une combinaison est difficile à lire.'
                        : `${failures.length} combinaisons sont difficiles à lire.`}
                    </p>
                    <ul className="mt-2 space-y-1 text-[13px]">
                      {failures.map(f => (
                        <li key={`${f.fg}-${f.bg}`}>
                          {f.label} : <strong>{f.ratio.toFixed(1)}:1</strong>, il en faut {f.min} au
                          minimum.
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[12px] text-gold">
                      Rien ne vous empêche d’enregistrer, mais certains visiteurs ne pourront pas
                      lire ces textes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Identité et programmation ────────────────────────────── */}
            <section className={`${CARD} p-5`}>
              <h2 className="font-serif text-lg text-ink mb-4">Réglages du thème</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={LABEL}>Nom</label>
                  <input
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink"
                  />
                </div>
                <div>
                  <label className={LABEL}>Identifiant</label>
                  <input
                    value={draft.slug}
                    disabled
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink-dimmer bg-bg-raised"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock size={15} className="text-gold" />
                  <h3 className="text-sm font-semibold text-ink">Programmation</h3>
                </div>
                <p className="text-xs text-ink-dimmer mb-3">
                  Entre ces deux dates, ce thème remplace le thème par défaut, puis le site revient
                  tout seul à la normale. Laissez vide pour ne pas programmer.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Du</label>
                    <input
                      type="date"
                      value={draft.starts_on || ''}
                      onChange={e => setDraft({ ...draft, starts_on: e.target.value || null })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Au (inclus)</label>
                    <input
                      type="date"
                      value={draft.ends_on || ''}
                      onChange={e => setDraft({ ...draft, ends_on: e.target.value || null })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Couleurs ─────────────────────────────────────────────── */}
            {TOKEN_GROUPS.map(group => (
              <section key={group.title} className={`${CARD} p-5`}>
                <h2 className="font-serif text-lg text-ink">{group.title}</h2>
                <p className="text-xs text-ink-dimmer mt-0.5 mb-4">{group.hint}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.keys.map(key => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={tokens[key]}
                        onChange={e => setToken(key, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-bg-panel"
                        aria-label={TOKEN_LABELS[key]}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink truncate">{TOKEN_LABELS[key]}</p>
                        <input
                          value={tokens[key]}
                          onChange={e => setToken(key, e.target.value)}
                          className="w-full text-[11px] font-mono text-ink-dimmer bg-transparent outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* ── Aperçu + actions ───────────────────────────────────────── */}
          <div className="lg:sticky lg:top-4 space-y-4">
            <section className={`${CARD} p-4`}>
              <h2 className="font-serif text-base text-ink mb-3">Aperçu</h2>
              <ThemePreview t={tokens} />
              <p className="text-[11px] text-ink-dimmer mt-2.5 leading-relaxed">
                Reproduction d’une carte produit et d’un bouton. L’aperçu suit vos modifications
                avant enregistrement.
              </p>
            </section>

            <section className={`${CARD} p-4 space-y-2.5`}>
              <button
                onClick={save}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dim disabled:opacity-50 text-ink-invert rounded-xl font-semibold text-sm transition-colors"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Enregistrer
              </button>

              <button
                onClick={activate}
                disabled={busy || isNew || draft.slug === activeSlug}
                className="w-full px-4 py-2.5 border border-border hover:bg-bg-raised disabled:opacity-40 text-ink rounded-xl font-semibold text-sm transition-colors"
              >
                {draft.slug === activeSlug
                  ? 'Déjà le thème par défaut'
                  : 'En faire le thème par défaut'}
              </button>

              {!draft.is_builtin && !isNew && (
                <button
                  onClick={remove}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-danger hover:bg-danger/10 rounded-xl font-semibold text-sm transition-colors"
                >
                  <Trash2 size={14} /> Supprimer ce thème
                </button>
              )}

              {appliedToday !== activeSlug && draft.slug === activeSlug && (
                <p className="text-[11px] text-ink-dimmer leading-relaxed pt-1">
                  Ce thème est le thème par défaut, mais une période programmée est en cours : le
                  site affiche actuellement « {themes.find(t => t.slug === appliedToday)?.name} ».
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

/** Aperçu fidèle aux composants réels : carte produit, bouton, texte discret. */
function ThemePreview({ t }: { t: Record<TokenKey, string> }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: t.border }}>
      <div className="p-3.5 space-y-3" style={{ background: t.bg }}>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: t['bg-panel'], borderColor: t.border }}
        >
          <div className="h-20" style={{ background: t['bg-sunken'] }} />
          <div className="p-2.5">
            <p className="text-[11px] leading-tight" style={{ color: t.ink }}>
              HP 14-em0002wm 14&quot;
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: t['ink-dimmer'] }}>
              PC Portables
            </p>
            {/* Le prix prend la couleur commerciale et le prix barré reste
                gris : l'aperçu doit montrer la hiérarchie réelle, sinon on
                règle une couleur en croyant en régler une autre. */}
            <p className="text-sm font-bold mt-1.5 tabular-nums" style={{ color: t.accent }}>
              299,000 FCFA{' '}
              <span
                className="text-[10px] font-normal line-through"
                style={{ color: t['ink-faint'] }}
              >
                349,000
              </span>
            </p>
          </div>
        </div>

        <button
          className="w-full py-2 rounded-lg text-[11px] font-bold"
          style={{ background: t.action, color: t['ink-invert'] }}
        >
          Ajouter au panier
        </button>

        {/* Les quatre accents de rayon, tels qu'ils apparaissent sur les
            boutons de gamme de l'accueil. */}
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              ['cat-portable', 'Port.'],
              ['cat-bureau', 'Bur.'],
              ['cat-gaming', 'Gam.'],
              ['cat-accessoire', 'Acc.'],
            ] as [TokenKey, string][]
          ).map(([key, label]) => (
            <div
              key={key}
              className="py-1.5 rounded text-[9px] font-bold text-center"
              style={{ background: t[key], color: t['ink-invert'] }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-extrabold px-1.5 py-[2px] rounded"
            style={{ background: t.gold, color: t['ink-invert'] }}
          >
            -20%
          </span>
          <span className="text-[9.5px]" style={{ color: t['ink-faint'] }}>
            promotion, usage rare
          </span>
        </div>

        <div
          className="rounded-lg px-2.5 py-2 border"
          style={{ background: t['bg-raised'], borderColor: t['border-mid'] }}
        >
          <p className="text-[10px]" style={{ color: t['ink-dim'] }}>
            Livraison estimée sous 5 jours
          </p>
        </div>

        <p className="text-[10px]" style={{ color: t['green-bright'] }}>
          Paiement confirmé
        </p>
      </div>
    </div>
  )
}
