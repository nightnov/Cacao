'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'

interface FaqItem {
  id?: string
  question: string
  answer: string
  sort_order: number
  is_visible: boolean
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'
const INPUT = 'w-full px-3 py-2 border border-[#E8E0D8] rounded-lg text-sm text-[#241A14]'

/**
 * Promesses que le site ne peut pas tenir, avec la raison technique.
 *
 * Ce n'est pas une correction automatique : réécrire une politique de retour
 * ou un délai de réponse relève de la décision commerciale, pas du code. On
 * signale, on explique, et on laisse trancher.
 *
 * Chaque motif est vérifiable dans le dépôt — aucun n'est supposé.
 */
const UNSUPPORTED_CLAIMS: { pattern: RegExp; unless?: RegExp; why: string }[] = [
  {
    pattern: /confirmation par (e-?)?mail|par email et sms|recevrez un email/i,
    why: "aucun envoi d'e-mail n'est installé dans le projet : le client ne recevra rien.",
  },
  {
    pattern: /num[ée]ro de suivi|suivi en temps r[ée]el/i,
    why: "aucun numéro de suivi n'est enregistré sur les commandes : il n'y a rien à communiquer.",
  },
  {
    pattern: /r[ée]ponse sous \d+\s*h|sous 24\s*h/i,
    why: 'engagement de délai de réponse, tenable seulement si vous vous y astreignez.',
  },
  {
    pattern: /\b\d+\s*jours?\s*(ouvrables?|ouvr[ée]s?)?\b/i,
    // Une formulation d'estimation lève l'alerte. Un simple `(?!…)` ne suffisait
    // pas : dans « livraison estimée sous 5 jours », le mot qui nuance précède
    // le délai, alors qu'une anticipation négative ne regarde que vers l'avant.
    unless: /estim|environ|g[ée]n[ée]ralement|en moyenne|d[ée]lai indicatif|selon le fournisseur/i,
    why: 'délai annoncé comme certain. En dropshipping il dépend du fournisseur — formulez-le comme une estimation.',
  },
  {
    pattern: /tous nos produits sont garantis|garantie de livraison/i,
    why: 'garantie annoncée sans condition ni durée. Précisez laquelle, ou retirez la phrase.',
  },
  {
    pattern: /\b\d+\s*jours?\s*après réception/i,
    why: "droit de retour chiffré. Vérifiez que vous pouvez l'assurer avant de l'afficher.",
  },
]

function claimsIn(text: string) {
  return UNSUPPORTED_CLAIMS.filter(c => c.pattern.test(text) && !(c.unless && c.unless.test(text)))
}

export default function AdminContent() {
  const [rows, setRows] = useState<FaqItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, FaqItem>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('faq_items').select('*').order('sort_order')
    setMissingTable(!!error)
    setRows((data || []) as FaqItem[])
    setDrafts({})
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const flagged = useMemo(() => {
    const out: { item: FaqItem; why: string[] }[] = []
    for (const r of rows) {
      const hits = claimsIn(`${r.question} ${r.answer}`)
      if (hits.length) out.push({ item: r, why: hits.map(h => h.why) })
    }
    return out
  }, [rows])

  const valueOf = (r: FaqItem) => drafts[r.id!] ?? r
  const isDirty = (r: FaqItem) => {
    const d = drafts[r.id!]
    return !!d && (d.question !== r.question || d.answer !== r.answer)
  }

  const edit = (r: FaqItem, patch: Partial<FaqItem>) => {
    setDrafts(prev => ({ ...prev, [r.id!]: { ...valueOf(r), ...patch } }))
  }

  const save = async (r: FaqItem) => {
    const d = valueOf(r)
    if (!d.question.trim() || !d.answer.trim()) {
      setMessage({ kind: 'ko', text: 'La question et la réponse sont obligatoires.' })
      return
    }
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('faq_items')
      .update({
        question: d.question.trim(),
        answer: d.answer.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', r.id!)
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({ kind: 'ok', text: 'Question enregistrée.' })
  }

  const add = async () => {
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('faq_items').insert({
      question: 'Nouvelle question',
      answer: 'Votre réponse.',
      sort_order: rows.length + 1,
    })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
  }

  const remove = async (r: FaqItem) => {
    if (!confirm(`Supprimer « ${r.question} » ?`)) return
    setBusy(true)
    const supabase = getSupabaseClient()
    await supabase.from('faq_items').delete().eq('id', r.id!)
    setBusy(false)
    await load()
    setMessage({ kind: 'ok', text: 'Question supprimée.' })
  }

  const toggle = async (r: FaqItem) => {
    setBusy(true)
    const supabase = getSupabaseClient()
    await supabase.from('faq_items').update({ is_visible: !r.is_visible }).eq('id', r.id!)
    setBusy(false)
    await load()
  }

  const move = async (i: number, dir: -1 | 1) => {
    const t = i + dir
    if (t < 0 || t >= rows.length) return
    const a = rows[i]
    const b = rows[t]
    setBusy(true)
    const supabase = getSupabaseClient()
    await supabase.from('faq_items').update({ sort_order: b.sort_order }).eq('id', a.id!)
    await supabase.from('faq_items').update({ sort_order: a.sort_order }).eq('id', b.id!)
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
          <h1 className="font-serif text-3xl text-[#241A14]">Contenu</h1>
          <p className="text-sm text-[#7D6A5D] mt-1">
            Les questions fréquentes affichées sur{' '}
            <Link href="/faq" target="_blank" className="text-[#C2410C] hover:underline">
              /faq
            </Link>
            .
          </p>
        </div>
        <button
          onClick={add}
          disabled={busy || missingTable}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white rounded-xl font-semibold text-sm whitespace-nowrap"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {missingTable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">La table des questions n’existe pas encore.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-amber-100 px-1 rounded">
                supabase/migrations/023_faq_items.sql
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

      {flagged.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={17} className="text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold">
                {flagged.length} réponse{flagged.length > 1 ? 's promettent' : ' promet'} quelque
                chose que le site ne fait pas.
              </p>
              <ul className="mt-2 space-y-2">
                {flagged.map(f => (
                  <li key={f.item.id}>
                    <span className="font-semibold">« {f.item.question} »</span>
                    <ul className="list-disc ml-5 mt-0.5 text-[13px]">
                      {f.why.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px]">
                Ces textes sont repris tels quels de ce qui est en ligne. Je ne les ai pas
                réécrits : décider d’un délai de retour ou d’une garantie vous appartient.
              </p>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 && !missingTable ? (
        <p className={`${CARD} p-8 text-center text-sm text-[#7D6A5D]`}>
          Aucune question. La page /faq affiche la liste de secours écrite dans le code.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const d = valueOf(r)
            const hits = claimsIn(`${d.question} ${d.answer}`)
            return (
              <section
                key={r.id}
                className={`${CARD} p-4 ${r.is_visible ? '' : 'opacity-60'} ${
                  hits.length ? 'border-red-300' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col pt-1">
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

                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={d.question}
                      onChange={e => edit(r, { question: e.target.value })}
                      className={`${INPUT} font-semibold`}
                    />
                    <textarea
                      value={d.answer}
                      onChange={e => edit(r, { answer: e.target.value })}
                      rows={3}
                      className={INPUT}
                    />

                    {hits.length > 0 && (
                      <ul className="text-[12px] text-red-700 space-y-0.5">
                        {hits.map((h, k) => (
                          <li key={k}>⚠ {h.why}</li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => save(r)}
                        disabled={busy || !isDirty(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-30 text-white rounded-lg font-semibold text-xs"
                      >
                        <Save size={13} /> Enregistrer
                      </button>
                      <button
                        onClick={() => toggle(r)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E0D8] hover:bg-gray-50 text-[#5B4B41] rounded-lg font-semibold text-xs"
                      >
                        {r.is_visible ? <EyeOff size={13} /> : <Eye size={13} />}
                        {r.is_visible ? 'Masquer' : 'Afficher'}
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busy}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[#7D6A5D] leading-relaxed">
        Les pages légales (conditions générales, confidentialité) restent dans le code : elles
        changent rarement et une erreur y coûte plus cher qu’un gain de souplesse.
      </p>
    </div>
  )
}
