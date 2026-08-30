'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import {
  CATEGORY_ICON_CHOICES,
  categoryIcon,
  FALLBACK_CATEGORIES,
} from '@/lib/categories'
import { invalidateCategoriesCache } from '@/hooks/useCategories'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'

interface Category {
  value: string
  label: string
  short_label: string
  icon: string
  description: string | null
  tagline: string | null
  image_url: string | null
  sort_order: number
  is_visible: boolean
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const LABEL = 'block text-xs font-semibold text-[#5B4B41] mb-1.5'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<Category | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('category'),
    ])

    setMissingTable(!!catRes.error)
    setRows((catRes.data || []) as Category[])

    const map: Record<string, number> = {}
    for (const p of prodRes.data || []) map[p.category] = (map[p.category] || 0) + 1
    setCounts(map)

    setLoading(false)
    invalidateCategoriesCache()
  }

  useEffect(() => {
    load()
  }, [])

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true)
    setMessage(null)
    const { error } = await fn()
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return false
    }
    await load()
    setMessage({ kind: 'ok', text: ok })
    return true
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return

    const a = rows[index]
    const b = rows[target]
    const supabase = getSupabaseClient()

    // Les deux positions sont échangées explicitement plutôt que réindexées :
    // c'est deux écritures au lieu de huit, et l'ordre reste correct même si
    // les valeurs de départ ne se suivaient pas.
    await run(async () => {
      const r1 = await supabase
        .from('categories')
        .update({ sort_order: b.sort_order })
        .eq('value', a.value)
      if (r1.error) return r1
      return supabase
        .from('categories')
        .update({ sort_order: a.sort_order })
        .eq('value', b.value)
    }, 'Ordre mis à jour.')
  }

  const toggleVisible = async (cat: Category) => {
    const supabase = getSupabaseClient()
    await run(
      async () =>
        supabase
          .from('categories')
          .update({ is_visible: !cat.is_visible })
          .eq('value', cat.value),
      cat.is_visible
        ? `« ${cat.label} » n’apparaît plus dans les menus.`
        : `« ${cat.label} » est de nouveau visible.`
    )
  }

  const save = async () => {
    if (!editing) return
    if (!editing.label.trim()) {
      setMessage({ kind: 'ko', text: 'Le nom est obligatoire.' })
      return
    }
    if (isNew && !editing.value) {
      setMessage({ kind: 'ko', text: 'Le nom ne permet pas de créer un identifiant valide.' })
      return
    }
    if (isNew && rows.some(r => r.value === editing.value)) {
      setMessage({ kind: 'ko', text: 'Un rayon utilise déjà cet identifiant.' })
      return
    }

    const supabase = getSupabaseClient()
    const payload = {
      value: editing.value,
      label: editing.label.trim(),
      short_label: editing.short_label.trim() || editing.label.trim(),
      icon: editing.icon,
      description: editing.description?.trim() || null,
      tagline: editing.tagline?.trim() || null,
      image_url: editing.image_url || null,
      sort_order: isNew ? rows.length + 1 : editing.sort_order,
      is_visible: editing.is_visible,
    }

    const ok = await run(
      async () => supabase.from('categories').upsert(payload, { onConflict: 'value' }),
      isNew ? 'Rayon créé.' : 'Rayon enregistré.'
    )
    if (ok) {
      setEditing(null)
      setIsNew(false)
    }
  }

  const remove = async (cat: Category) => {
    const used = counts[cat.value] || 0
    if (used > 0) {
      setMessage({
        kind: 'ko',
        text: `« ${cat.label} » contient ${used} produit${used > 1 ? 's' : ''}. Déplacez-les d’abord, ou masquez le rayon au lieu de le supprimer.`,
      })
      return
    }
    if (!confirm(`Supprimer le rayon « ${cat.label} » ?`)) return

    const supabase = getSupabaseClient()
    const ok = await run(
      async () => supabase.from('categories').delete().eq('value', cat.value),
      'Rayon supprimé.'
    )
    if (ok) setEditing(null)
  }

  /**
   * Téléverse la photo du rayon dans le même dépôt que les images produits.
   *
   * L'image est enregistrée tout de suite en base plutôt qu'à la validation du
   * formulaire : sans ça, un fichier téléversé puis abandonné resterait dans le
   * dépôt sans que rien n'y renvoie.
   */
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editing) return

    if (!file.type.startsWith('image/')) {
      setMessage({ kind: 'ko', text: 'Ce fichier n’est pas une image.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ kind: 'ko', text: 'L’image dépasse 5 Mo.' })
      return
    }

    setUploading(true)
    setMessage(null)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `categories/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file)
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      setEditing({ ...editing, image_url: data.publicUrl })
    } catch (err: any) {
      setMessage({ kind: 'ko', text: err.message || 'Envoi impossible.' })
    } finally {
      setUploading(false)
      // Sans ça, choisir deux fois le même fichier ne déclencherait rien.
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const startNew = () => {
    setIsNew(true)
    setEditing({
      value: '',
      label: '',
      short_label: '',
      icon: 'Package',
      description: null,
      tagline: null,
      image_url: null,
      sort_order: rows.length + 1,
      is_visible: true,
    })
    setMessage(null)
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
          <h1 className="font-serif text-3xl text-[#241A14]">Rayons</h1>
          <p className="text-sm text-[#7D6A5D] mt-1">
            Les catégories affichées dans le menu, sur l’accueil et dans le catalogue.
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl font-semibold text-sm whitespace-nowrap"
        >
          <Plus size={15} /> Nouveau rayon
        </button>
      </div>

      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">La table des rayons n’existe pas encore.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-amber-100 px-1 rounded">
                supabase/migrations/021_categories.sql
              </code>{' '}
              dans l’éditeur SQL de Supabase, puis rechargez. En attendant, la boutique affiche les{' '}
              {FALLBACK_CATEGORIES.length} rayons d’origine, non modifiables.
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

      {/* ── Formulaire ────────────────────────────────────────────────── */}
      {editing && (
        <section className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-[#241A14] mb-4">
            {isNew ? 'Nouveau rayon' : `Modifier « ${editing.label} »`}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>NOM AFFICHÉ</label>
              <input
                value={editing.label}
                onChange={e =>
                  setEditing({
                    ...editing,
                    label: e.target.value,
                    // L'identifiant se déduit du nom, mais uniquement à la
                    // création : le changer ensuite casserait les liens déjà
                    // partagés et le classement des produits existants.
                    value: isNew ? slugify(e.target.value) : editing.value,
                  })
                }
                placeholder="PC Portables"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>NOM COURT (MENUS DENSES)</label>
              <input
                value={editing.short_label}
                onChange={e => setEditing({ ...editing, short_label: e.target.value })}
                placeholder={editing.label || 'Portables'}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>IDENTIFIANT (ADRESSE)</label>
              <input value={editing.value} disabled className={`${INPUT} bg-gray-50 text-[#7D6A5D]`} />
              <p className="text-[11px] text-[#7D6A5D] mt-1">
                {isNew
                  ? 'Généré à partir du nom.'
                  : 'Non modifiable : il apparaît dans les liens déjà partagés.'}
              </p>
            </div>
            <div>
              <label className={LABEL}>ICÔNE</label>
              <select
                value={editing.icon}
                onChange={e => setEditing({ ...editing, icon: e.target.value })}
                className={INPUT}
              >
                {CATEGORY_ICON_CHOICES.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>ACCROCHE (CARTE DE L&apos;ACCUEIL)</label>
              <input
                value={editing.tagline || ''}
                onChange={e => setEditing({ ...editing, tagline: e.target.value })}
                placeholder="Mobilité et autonomie pour le travail et les études"
                className={INPUT}
              />
              <p className="text-[11px] text-[#7D6A5D] mt-1">
                Une ligne, sous le titre de la carte. Gardez-la courte : au-delà de deux lignes,
                les quatre cartes cessent d&apos;avoir la même hauteur.
              </p>
            </div>

            {/* Visuel de la carte de gamme */}
            <div className="sm:col-span-2">
              <label className={LABEL}>PHOTO DE LA CARTE</label>
              <div className="flex items-start gap-4">
                <div className="w-32 aspect-[4/3] rounded-lg border border-[#E8E0D8] bg-gray-50 grid place-items-center overflow-hidden flex-shrink-0">
                  {editing.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editing.image_url}
                      alt=""
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-[#C9BCAE]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E0D8] hover:bg-gray-50 disabled:opacity-50 text-[#241A14] rounded-lg font-semibold text-xs"
                    >
                      <Upload size={13} />
                      {uploading ? 'Envoi…' : editing.image_url ? 'Remplacer' : 'Choisir une image'}
                    </button>
                    {editing.image_url && (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, image_url: null })}
                        className="px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#7D6A5D] mt-2 leading-relaxed">
                    Format paysage, idéalement 800 × 600 px, 5 Mo maximum. L&apos;image est
                    affichée entière et non recadrée : un fond uni ou détouré rend mieux.
                    Sans photo, la carte retombe sur l&apos;icône du rayon.
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>DESCRIPTION (HAUT DE LA PAGE CATALOGUE)</label>
              <textarea
                value={editing.description || ''}
                onChange={e => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className={INPUT}
              />
            </div>
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
              onClick={() => {
                setEditing(null)
                setIsNew(false)
              }}
              className="px-4 py-2 border border-[#E8E0D8] hover:bg-gray-50 text-[#5B4B41] rounded-xl font-semibold text-sm"
            >
              Annuler
            </button>
            {!isNew && (
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

      {/* ── Liste ─────────────────────────────────────────────────────── */}
      <section className={CARD}>
        <div className="px-5 py-4 border-b border-[#E8E0D8]">
          <h2 className="font-serif text-lg text-[#241A14]">Ordre d’affichage</h2>
          <p className="text-xs text-[#7D6A5D] mt-0.5">
            Cet ordre s’applique au menu, au pied de page, à l’accueil et au catalogue. Les trois
            premiers apparaissent dans le pied de page, les quatre premiers sur l’accueil.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#7D6A5D]">
            Aucun rayon en base. Exécutez la migration 021 pour reprendre les rayons existants.
          </p>
        ) : (
          <ul>
            {rows.map((cat, i) => {
              const Icon = categoryIcon(cat.icon)
              const used = counts[cat.value] || 0
              return (
                <li
                  key={cat.value}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-[#F1EBE3] last:border-0 ${
                    cat.is_visible ? '' : 'opacity-55'
                  }`}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy}
                      className="text-[#7D6A5D] hover:text-[#C2410C] disabled:opacity-25"
                      aria-label="Monter"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1 || busy}
                      className="text-[#7D6A5D] hover:text-[#C2410C] disabled:opacity-25"
                      aria-label="Descendre"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  <span className="w-9 h-9 rounded-lg bg-orange-50 text-[#C2410C] grid place-items-center flex-shrink-0">
                    <Icon size={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#241A14] truncate">{cat.label}</p>
                    <p className="text-[11px] text-[#7D6A5D] truncate">
                      /products?category={cat.value} · {used} produit{used > 1 ? 's' : ''}
                    </p>
                  </div>

                  {i < 3 && cat.is_visible && (
                    <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-[#5B4B41] whitespace-nowrap">
                      PIED DE PAGE
                    </span>
                  )}

                  <button
                    onClick={() => toggleVisible(cat)}
                    disabled={busy}
                    title={cat.is_visible ? 'Masquer dans les menus' : 'Afficher dans les menus'}
                    className="text-[#7D6A5D] hover:text-[#C2410C] p-1.5"
                  >
                    {cat.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  <button
                    onClick={() => {
                      setEditing({ ...cat })
                      setIsNew(false)
                      setMessage(null)
                    }}
                    className="text-sm font-semibold text-[#C2410C] hover:underline whitespace-nowrap"
                  >
                    Modifier
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-[#7D6A5D] leading-relaxed">
        Masquer un rayon le retire des menus mais ne touche pas aux produits qu’il contient : ils
        restent trouvables par la recherche et par leur lien direct. Un rayon ne peut être supprimé
        que s’il est vide.
      </p>
    </div>
  )
}
