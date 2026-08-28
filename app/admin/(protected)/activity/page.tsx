'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatAmount } from '@/lib/format'
import {
  Loader2,
  ShoppingCart,
  CreditCard,
  XCircle,
  UserPlus,
  MessageSquare,
  Star,
  Boxes,
  Info,
} from 'lucide-react'

type Family = 'commande' | 'paiement' | 'stock' | 'client' | 'message' | 'avis'

interface Event {
  id: string
  family: Family
  at: string
  title: string
  detail?: string
  tone: 'neutral' | 'good' | 'bad'
}

const CARD = 'bg-white border border-[#E8E0D8] rounded-2xl'

const FAMILY_META: Record<Family, { label: string; icon: any }> = {
  commande: { label: 'Commandes', icon: ShoppingCart },
  paiement: { label: 'Paiements', icon: CreditCard },
  stock: { label: 'Stock', icon: Boxes },
  client: { label: 'Clients', icon: UserPlus },
  message: { label: 'Messages', icon: MessageSquare },
  avis: { label: 'Avis', icon: Star },
}

const PAYMENT_LABEL: Record<string, { text: string; tone: Event['tone'] }> = {
  initiated: { text: 'Paiement lancé', tone: 'neutral' },
  successful: { text: 'Paiement réussi', tone: 'good' },
  failed: { text: 'Paiement échoué', tone: 'bad' },
  refunded: { text: 'Paiement remboursé', tone: 'bad' },
}

const STOCK_LABEL: Record<string, string> = {
  sale: 'Vente',
  restock: 'Réapprovisionnement',
  manual: 'Correction manuelle',
  cancellation: 'Annulation',
}

function ago(iso: string): string {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  if (mins < 60 * 24) return `il y a ${Math.floor(mins / 60)} h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function AdminActivity() {
  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState<Family | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const LIMIT = 40

      // Chaque source est interrogée séparément puis fusionnée par date. Une
      // requête échouée (table pas encore créée) ne doit pas vider le journal :
      // d'où le `data || []` systématique plutôt qu'un `throw`.
      const [orders, payments, stock, customers, messages, reviews] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, total_fcfa, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('payment_logs')
          .select('id, order_id, status, amount_fcfa, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('stock_movements')
          .select('id, delta, stock_after, reason, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('messages')
          .select('id, sender, body, product_name, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('reviews')
          .select('id, rating, comment, created_at')
          .order('created_at', { ascending: false })
          .limit(LIMIT),
      ])

      const all: Event[] = []

      for (const o of orders.data || []) {
        all.push({
          id: `o-${o.id}`,
          family: 'commande',
          at: o.created_at,
          title: `Commande ${o.order_number}`,
          detail: `${formatAmount(o.total_fcfa)} FCFA · ${o.status}`,
          tone: o.status === 'cancelled' ? 'bad' : 'neutral',
        })
      }

      for (const p of payments.data || []) {
        const meta = PAYMENT_LABEL[p.status] || { text: p.status, tone: 'neutral' as const }
        all.push({
          id: `p-${p.id}`,
          family: 'paiement',
          at: p.created_at,
          title: meta.text,
          detail: `${formatAmount(p.amount_fcfa)} FCFA`,
          tone: meta.tone,
        })
      }

      for (const s of stock.data || []) {
        all.push({
          id: `s-${s.id}`,
          family: 'stock',
          at: s.created_at,
          title: `${STOCK_LABEL[s.reason] || s.reason} : ${s.delta > 0 ? '+' : ''}${s.delta}`,
          detail: s.stock_after !== null ? `reste ${s.stock_after}` : undefined,
          tone: s.delta < 0 ? 'neutral' : 'good',
        })
      }

      for (const c of customers.data || []) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
        all.push({
          id: `c-${c.id}`,
          family: 'client',
          at: c.created_at,
          title: 'Nouveau compte client',
          detail: name || c.email,
          tone: 'good',
        })
      }

      for (const m of messages.data || []) {
        all.push({
          id: `m-${m.id}`,
          family: 'message',
          at: m.created_at,
          title: m.sender === 'customer' ? 'Message reçu' : 'Réponse envoyée',
          detail: [m.product_name, (m.body || '').slice(0, 70)].filter(Boolean).join(' — '),
          tone: 'neutral',
        })
      }

      for (const r of reviews.data || []) {
        all.push({
          id: `r-${r.id}`,
          family: 'avis',
          at: r.created_at,
          title: `Avis ${r.rating}/5`,
          detail: (r.comment || '').slice(0, 70) || undefined,
          tone: r.rating >= 4 ? 'good' : r.rating <= 2 ? 'bad' : 'neutral',
        })
      }

      all.sort((a, b) => (a.at < b.at ? 1 : -1))
      setEvents(all.slice(0, 120))
      setLoading(false)
    }
    load()
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length }
    for (const e of events) c[e.family] = (c[e.family] || 0) + 1
    return c
  }, [events])

  const visible = filter === 'all' ? events : events.filter(e => e.family === filter)

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5B4B41] text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#241A14]">Journal d’activité</h1>
        <p className="text-sm text-[#7D6A5D] mt-1">
          Ce qui s’est passé sur la boutique, du plus récent au plus ancien.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-2.5">
        <Info size={17} className="text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Ce journal reconstitue, il n’enregistre pas.</p>
          <p className="mt-1">
            Il assemble ce qui existe déjà : commandes, paiements, mouvements de stock, comptes,
            messages et avis. <strong>Vos propres actions n’y figurent pas</strong> — modifier un
            prix ou un réglage ne laisse aucune trace aujourd’hui. Les afficher demanderait
            d’enregistrer chaque écriture au moment où elle se fait, ce qui est un chantier à part.
          </p>
        </div>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="p-4 border-b border-[#E8E0D8] flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-orange-50 text-[#C2410C] border border-[#C2410C]'
                : 'border border-[#E8E0D8] text-[#5B4B41] hover:bg-gray-50'
            }`}
          >
            Tout ({counts.all})
          </button>
          {(Object.keys(FAMILY_META) as Family[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              disabled={!counts[f]}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${
                filter === f
                  ? 'bg-orange-50 text-[#C2410C] border border-[#C2410C]'
                  : 'border border-[#E8E0D8] text-[#5B4B41] hover:bg-gray-50'
              }`}
            >
              {FAMILY_META[f].label} ({counts[f] || 0})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#7D6A5D]">
            {events.length === 0
              ? 'Rien à afficher pour l’instant. Les événements apparaîtront à la première commande, au premier compte créé ou au premier message.'
              : 'Aucun événement dans cette catégorie.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#F1EBE3]">
            {visible.map(e => {
              const Icon = FAMILY_META[e.family].icon
              const iconCls =
                e.tone === 'good'
                  ? 'bg-green-50 text-green-700'
                  : e.tone === 'bad'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-100 text-[#5B4B41]'
              return (
                <li key={e.id} className="px-4 py-3 flex items-start gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${iconCls}`}
                  >
                    {e.tone === 'bad' && e.family === 'paiement' ? (
                      <XCircle size={15} />
                    ) : (
                      <Icon size={15} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#241A14]">{e.title}</p>
                    {e.detail && (
                      <p className="text-[12px] text-[#7D6A5D] truncate">{e.detail}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#7D6A5D] whitespace-nowrap pt-0.5">
                    {ago(e.at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
