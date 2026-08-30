'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { AlertTriangle, Eye, EyeOff, Loader2, Star } from 'lucide-react'

interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  is_hidden: boolean
  hidden_reason: string | null
  products: { name: string; slug: string } | null
  profiles: { first_name: string | null; last_name: string | null; email: string } | null
}

type Filter = 'all' | 'visible' | 'hidden' | 'low'

const CARD = 'bg-bg-panel border border-border rounded-2xl'

/** Motifs proposés, pour garder une trace exploitable plus tard. */
const REASONS = [
  'Propos injurieux',
  'Hors sujet',
  'Concurrent ou faux avis',
  'Données personnelles',
  'Doublon',
  'Autre',
]

export default function AdminReviews() {
  const [rows, setRows] = useState<Review[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [missingColumn, setMissingColumn] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'ko'; text: string } | null>(null)

  const load = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id, product_id, user_id, rating, comment, created_at, is_hidden, hidden_reason, products(name, slug), profiles(first_name, last_name, email)'
      )
      .order('created_at', { ascending: false })

    // La colonne n'existe qu'après la migration 024.
    setMissingColumn(!!error && /is_hidden|hidden_reason/.test(error.message))
    setRows((data || []) as unknown as Review[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(
    () => ({
      all: rows.length,
      visible: rows.filter(r => !r.is_hidden).length,
      hidden: rows.filter(r => r.is_hidden).length,
      low: rows.filter(r => r.rating <= 2 && !r.is_hidden).length,
    }),
    [rows]
  )

  const visible = useMemo(() => {
    if (filter === 'visible') return rows.filter(r => !r.is_hidden)
    if (filter === 'hidden') return rows.filter(r => r.is_hidden)
    if (filter === 'low') return rows.filter(r => r.rating <= 2 && !r.is_hidden)
    return rows
  }, [rows, filter])

  const hide = async (r: Review) => {
    const reason = prompt(
      `Masquer cet avis ${r.rating}/5 ?\n\nMotif (facultatif, pour vous en souvenir) :\n${REASONS.join(' · ')}`,
      ''
    )
    // `prompt` renvoie null si on annule, chaîne vide si on valide sans motif.
    if (reason === null) return

    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('reviews')
      .update({
        is_hidden: true,
        hidden_reason: reason.trim() || null,
        hidden_at: new Date().toISOString(),
      })
      .eq('id', r.id)
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({
      kind: 'ok',
      text: 'Avis masqué. Il ne compte plus dans la note du produit.',
    })
  }

  const show = async (r: Review) => {
    setBusy(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('reviews')
      .update({ is_hidden: false, hidden_reason: null, hidden_at: null })
      .eq('id', r.id)
    setBusy(false)
    if (error) {
      setMessage({ kind: 'ko', text: error.message })
      return
    }
    await load()
    setMessage({ kind: 'ok', text: 'Avis republié.' })
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
      <div>
        <h1 className="font-serif text-3xl text-ink">Avis</h1>
        <p className="text-sm text-ink-dimmer mt-1">
          Les avis paraissent immédiatement. Vous pouvez en masquer un après coup.
        </p>
      </div>

      {missingColumn && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={17} className="text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gold">
            <p className="font-semibold">La modération n’est pas encore installée.</p>
            <p className="mt-1">
              Exécutez{' '}
              <code className="bg-gold/15 px-1 rounded">
                supabase/migrations/024_review_moderation.sql
              </code>
              . Sans elle, <strong>aucun avis ne peut être retiré</strong> : un commentaire
              injurieux reste en ligne tant que son auteur ne le supprime pas lui-même.
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

      <section className={CARD}>
        <div className="p-4 border-b border-border flex flex-wrap gap-2">
          {(
            [
              ['all', `Tous (${counts.all})`],
              ['visible', `En ligne (${counts.visible})`],
              ['low', `Notes basses (${counts.low})`],
              ['hidden', `Masqués (${counts.hidden})`],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === k
                  ? 'bg-gold/10 text-gold border border-gold'
                  : 'border border-border text-ink-dim hover:bg-bg-raised'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-dimmer">
            {rows.length === 0
              ? 'Aucun avis pour l’instant. Ils apparaîtront quand un client connecté en laissera un.'
              : 'Aucun avis dans cette catégorie.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map(r => {
              const name =
                [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ') ||
                r.profiles?.email ||
                'Client'
              return (
                <li key={r.id} className={`p-4 ${r.is_hidden ? 'bg-bg-raised opacity-75' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          size={13}
                          className={
                            n <= r.rating
                              ? 'fill-gold text-gold'
                              : 'text-border'
                          }
                        />
                      ))}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink">
                        <span className="font-semibold">{name}</span>
                        {r.products?.slug ? (
                          <>
                            {' — '}
                            <Link
                              href={`/products/${r.products.slug}`}
                              target="_blank"
                              className="text-gold hover:underline"
                            >
                              {r.products.name}
                            </Link>
                          </>
                        ) : (
                          <span className="text-ink-dimmer"> — produit supprimé</span>
                        )}
                      </p>

                      {r.comment ? (
                        <p className="text-sm text-ink-dim mt-1 whitespace-pre-wrap">
                          {r.comment}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-dimmer mt-1 italic">Note sans commentaire</p>
                      )}

                      {r.is_hidden && (
                        <p className="text-[12px] text-danger mt-1.5">
                          Masqué{r.hidden_reason ? ` — ${r.hidden_reason}` : ''}
                        </p>
                      )}

                      <p className="text-[11px] text-ink-dimmer mt-1.5">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => (r.is_hidden ? show(r) : hide(r))}
                      disabled={busy || missingColumn}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap disabled:opacity-40 ${
                        r.is_hidden
                          ? 'border border-border text-ink-dim hover:bg-bg-panel'
                          : 'text-danger hover:bg-danger/10'
                      }`}
                    >
                      {r.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      {r.is_hidden ? 'Republier' : 'Masquer'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-ink-dimmer leading-relaxed">
        Masquer un avis le retire de la fiche produit <strong>et</strong> de la note moyenne — sans
        quoi masquer un « 1 sur 5 » injurieux laisserait quand même la note du produit au plancher.
        L’avis n’est pas supprimé : son auteur continue de le voir et vous pouvez le republier.
      </p>
    </div>
  )
}
