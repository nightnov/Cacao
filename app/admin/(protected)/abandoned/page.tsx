'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatAmount } from '@/lib/format'
import { Archive, Info, Loader2, MessageCircle, Phone } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  status: string
  total_fcfa: number
  created_at: string
  shipping_address: { full_name?: string; phone?: string; city?: string } | null
}

interface Row extends Order {
  lastPayment: 'aucune' | 'initiated' | 'failed' | 'successful'
  items: string[]
  ageDays: number
}

type Filter = 'all' | 'never' | 'failed'

const CARD = 'bg-bg-panel border border-border rounded-2xl'

/**
 * Un numéro ivoirien saisi « 07 00 00 00 00 » devient « 2250700000000 ».
 *
 * Le texte dépend de ce que dit le dernier paiement, et ce n'est pas un détail
 * de politesse. Le message était figé sur « votre commande n'a pas été réglée »
 * quel que soit l'état réel : un client dont le paiement a abouti mais dont la
 * commande est restée bloquée recevait donc l'accusation d'un impayé pour un
 * dysfonctionnement qui n'est pas le sien. On ne réclame pas de l'argent déjà
 * reçu.
 */
function waLink(
  phone: string | undefined,
  orderNumber: string,
  lastPayment: Row['lastPayment']
): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  const full = digits.startsWith('225') ? digits : `225${digits}`

  const message =
    lastPayment === 'successful'
      ? `Bonjour, nous avons bien reçu le paiement de votre commande ${orderNumber} sur CACAO. ` +
        `Nous la préparons et nous vous recontactons pour la livraison.`
      : lastPayment === 'failed'
        ? `Bonjour, le paiement de votre commande ${orderNumber} sur CACAO n'est pas allé au bout. ` +
          `Souhaitez-vous réessayer ?`
        : `Bonjour, votre commande ${orderNumber} sur CACAO est enregistrée mais le paiement ` +
          `n'a pas été finalisé. Souhaitez-vous la terminer ?`

  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

export default function AdminAbandoned() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()

      // Les commandes restées en attente : elles sont créées avant le paiement,
      // donc une commande jamais confirmée est un paiement qui n'est pas allé
      // au bout.
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, total_fcfa, created_at, shipping_address')
        .eq('status', 'pending')
        // Les commandes rangées ne remontent pas ici : les faire réapparaître
        // dans cette liste viderait le geste de rangement de tout son sens.
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      const ids = (orders || []).map(o => o.id)
      const [paymentsRes, itemsRes] = await Promise.all([
        ids.length
          ? supabase
              .from('payment_logs')
              .select('order_id, status, created_at')
              .in('order_id', ids)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase
              .from('order_items')
              .select('order_id, product_name, quantity')
              .in('order_id', ids)
          : Promise.resolve({ data: [] as any[] }),
      ])

      // On ne garde que la tentative la plus récente : c'est elle qui dit où en
      // est le client, pas l'historique complet.
      const lastByOrder = new Map<string, string>()
      for (const p of paymentsRes.data || []) {
        if (!lastByOrder.has(p.order_id)) lastByOrder.set(p.order_id, p.status)
      }

      const itemsByOrder = new Map<string, string[]>()
      for (const it of itemsRes.data || []) {
        const list = itemsByOrder.get(it.order_id) || []
        list.push(`${it.product_name} × ${it.quantity}`)
        itemsByOrder.set(it.order_id, list)
      }

      const now = Date.now()
      const built: Row[] = (orders || []).map(o => ({
        ...(o as Order),
        lastPayment: (lastByOrder.get(o.id) as Row['lastPayment']) || 'aucune',
        items: itemsByOrder.get(o.id) || [],
        ageDays: Math.floor((now - new Date(o.created_at).getTime()) / 86400000),
      }))

      setRows(built)
      setLoading(false)
    }
    load()
  }, [])

  const counts = useMemo(
    () => ({
      all: rows.length,
      never: rows.filter(r => r.lastPayment === 'aucune' || r.lastPayment === 'initiated').length,
      failed: rows.filter(r => r.lastPayment === 'failed').length,
    }),
    [rows]
  )

  const visible = useMemo(() => {
    if (filter === 'never')
      return rows.filter(r => r.lastPayment === 'aucune' || r.lastPayment === 'initiated')
    if (filter === 'failed') return rows.filter(r => r.lastPayment === 'failed')
    return rows
  }, [rows, filter])

  const potential = useMemo(() => rows.reduce((s, r) => s + r.total_fcfa, 0), [rows])

  /**
   * Les commandes en attente depuis plus d'une semaine.
   *
   * Le seuil n'est pas cosmétique : une commande de la veille peut encore être
   * réglée, on la relance. Passé une semaine, plus personne ne revient finir un
   * paiement, et ces lignes ne font que gonfler le « montant en jeu » d'un
   * argent qui n'existe pas.
   */
  const vieilles = useMemo(() => rows.filter(r => r.ageDays >= 7), [rows])

  const rangerLesVieilles = async () => {
    if (
      !confirm(
        `Ranger ${vieilles.length} commande(s) en attente depuis plus de 7 jours ?\n\n` +
          'Elles quittent cette liste et restent consultables dans Commandes, ' +
          'via « Voir les commandes rangées ». Rien n est supprimé.'
      )
    )
      return

    try {
      const supabase = getSupabaseClient()
      // `select()` est indispensable : une écriture refusée par les droits en
      // base ne remonte aucune erreur, elle touche zéro ligne en silence.
      const { data, error } = await supabase
        .from('orders')
        .update({ archived_at: new Date().toISOString() })
        .in('id', vieilles.map(r => r.id))
        .select('id')

      if (error) throw error
      if (!data?.length) throw new Error('La base a refusé la modification.')

      const rangees = new Set(data.map(d => d.id))
      setRows(rows.filter(r => !rangees.has(r.id)))
    } catch (e) {
      alert(
        'Impossible de ranger ces commandes : ' +
          (e instanceof Error ? e.message : 'cause inconnue.')
      )
    }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-ink">Commandes non réglées</h1>
          <p className="text-sm text-ink-dimmer mt-1">
            Des clients sont allés jusqu’au paiement sans le terminer.
          </p>
        </div>

        {/* Le bouton n'apparaît que s'il a quelque chose à ranger : un bouton
            qui ne fait rien quand on l'actionne apprend à ne plus s'y fier. */}
        {vieilles.length > 0 && (
          <button
            onClick={rangerLesVieilles}
            className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-bg-raised text-ink rounded-lg font-semibold text-xs whitespace-nowrap"
          >
            <Archive size={14} /> Ranger les {vieilles.length} de plus de 7 jours
          </button>
        )}
      </div>

      <div className="bg-info/10 border border-info/30 rounded-xl p-4 flex items-start gap-2.5">
        <Info size={17} className="text-info flex-shrink-0 mt-0.5" />
        <div className="text-sm text-info">
          <p className="font-semibold">
            Ce ne sont pas des « paniers abandonnés » au sens habituel.
          </p>
          <p className="mt-1">
            Le panier vit dans le navigateur du visiteur : quelqu’un qui ajoute un produit puis
            ferme l’onglet <strong>ne laisse aucune trace</strong> et n’apparaîtra jamais ici. Ce
            que vous voyez, ce sont les clients allés jusqu’à valider leur adresse — la commande
            existe alors en base — mais dont le paiement n’a pas abouti.
          </p>
          <p className="mt-1.5">
            Aucune relance automatique n’est possible : le site n’envoie pas d’e-mails. D’où les
            boutons d’appel et de WhatsApp ci-dessous.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${CARD} p-4`}>
          <p className="text-xs text-ink-dimmer mb-1.5">Commandes en attente</p>
          <p className="font-serif text-3xl text-ink tabular-nums">{counts.all}</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-xs text-ink-dimmer mb-1.5">Paiements échoués</p>
          <p className="font-serif text-3xl text-danger tabular-nums">{counts.failed}</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-xs text-ink-dimmer mb-1.5">Montant en jeu</p>
          <p className="font-serif text-3xl text-ink tabular-nums">
            {formatAmount(potential)}
          </p>
          <p className="text-[11px] text-ink-dimmer mt-1">
            FCFA — si toutes étaient réglées, ce qui n’arrivera pas.
          </p>
        </div>
      </div>

      <section className={CARD}>
        <div className="p-4 border-b border-border flex flex-wrap gap-2">
          {(
            [
              ['all', `Toutes (${counts.all})`],
              ['never', `Sans paiement abouti (${counts.never})`],
              ['failed', `Paiement refusé (${counts.failed})`],
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
              ? 'Aucune commande en attente. Tout ce qui a été commandé a été réglé ou annulé.'
              : 'Aucune commande dans cette catégorie.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map(r => {
              const phone = r.shipping_address?.phone
              const wa = waLink(phone, r.order_number, r.lastPayment)
              return (
                <li key={r.id} className="p-4 flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {r.shipping_address?.full_name || 'Client'}
                      <span className="font-normal text-ink-dimmer"> · {r.order_number}</span>
                    </p>
                    <p className="text-[12px] text-ink-dim mt-0.5">
                      {r.items.length ? r.items.join(' · ') : 'Aucun article enregistré'}
                    </p>
                    <p className="text-[11px] text-ink-dimmer mt-1">
                      {formatAmount(r.total_fcfa)} FCFA · {r.shipping_address?.city || 'ville non renseignée'} ·{' '}
                      {r.ageDays === 0 ? "aujourd'hui" : `il y a ${r.ageDays} j`}
                      {r.lastPayment === 'failed' && (
                        <span className="text-danger font-semibold"> · paiement refusé</span>
                      )}
                      {r.lastPayment === 'aucune' && (
                        <span> · paiement jamais lancé</span>
                      )}
                      {r.lastPayment === 'initiated' && (
                        <span> · paiement lancé, non terminé</span>
                      )}
                    </p>

                    {/* Argent encaissé, commande restée en attente. Ce n'est
                        pas un impayé : c'est la confirmation qui n'est pas
                        redescendue de MoneyFusion. Sans cet avertissement, la
                        commande dort dans cette liste et le client, qui a
                        pourtant payé, n'est jamais livré. */}
                    {r.lastPayment === 'successful' && (
                      <p className="mt-2 text-[12px] text-danger font-semibold border border-danger/40 bg-danger/10 rounded-lg px-2.5 py-1.5">
                        Paiement reçu mais commande non confirmée. Vérifiez l encaissement chez
                        MoneyFusion, puis passez la commande en « Confirmée ». Ne réclamez pas le
                        paiement à ce client.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {phone ? (
                      <>
                        <a
                          href={`tel:${phone.replace(/\s/g, '')}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-bg-raised text-ink rounded-lg font-semibold text-xs whitespace-nowrap"
                        >
                          <Phone size={13} /> Appeler
                        </a>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-dim text-ink-invert rounded-lg font-semibold text-xs whitespace-nowrap"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-ink-dimmer">Aucun numéro</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-ink-dimmer leading-relaxed">
        Le message WhatsApp est pré-rempli mais rien n’est envoyé automatiquement : votre
        application s’ouvre, vous relisez, vous envoyez.
      </p>
    </div>
  )
}
