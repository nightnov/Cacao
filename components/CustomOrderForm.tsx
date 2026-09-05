'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { btn } from '@/lib/ui'
import { formatAmount } from '@/lib/format'

/**
 * Commande d'une machine à faire venir.
 *
 * Volontairement appelée « commande » et non « demande » : le client obtient
 * un numéro tout de suite et la retrouve dans son compte. Rien ici ne laisse
 * entendre que la marchandise n'est pas détenue — ce qui inviterait à la
 * chercher ailleurs — et rien n'est promis non plus.
 *
 * Aucun paiement n'est proposé. Le montant définitif est confirmé avant, ce
 * qui évite d'avoir à rembourser une machine qui ne serait pas obtenue : aucun
 * remboursement automatique n'existe dans le projet.
 */
interface Props {
  productId: string
  optionValueIds: string[]
  estimatedTotal: number
  userId?: string | null
  defaults?: { name?: string; phone?: string; city?: string; address?: string }
}

export function CustomOrderForm({
  productId,
  optionValueIds,
  estimatedTotal,
  userId,
  defaults,
}: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaults?.name || '')
  const [phone, setPhone] = useState(defaults?.phone || '')
  const [city, setCity] = useState(defaults?.city || '')
  const [address, setAddress] = useState(defaults?.address || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/custom-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          option_value_ids: optionValueIds,
          user_id: userId || null,
          contact_name: name,
          contact_phone: phone,
          city,
          address,
          message,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setOrderNumber(data.order_number)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSending(false)
    }
  }

  if (orderNumber) {
    return (
      <div className="rounded-xl border border-border bg-bg-raised p-5 text-center">
        <CheckCircle2 size={34} strokeWidth={1.6} className="text-success mx-auto mb-2.5" />
        <p className="font-semibold text-ink">Commande enregistrée</p>
        <p className="text-ink-dim text-[13.5px] mt-1 tabular-nums">{orderNumber}</p>
        <p className="text-ink-dim text-[13.5px] mt-3 leading-relaxed">
          Nous finalisons votre configuration et vous confirmons le montant par téléphone. Le
          paiement se fait ensuite, depuis votre compte.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div>
        {/* Sans compte, le client ne reverrait jamais sa commande : c'est dans
            son espace que le montant lui est confirmé et qu'il règle. On le dit
            avant qu'il remplisse le formulaire, pas après. */}
        {!userId ? (
          <Link href="/account/login" className={btn('solid', 'lg', 'w-full')}>
            Se connecter pour commander
          </Link>
        ) : (
        <button type="button" onClick={() => setOpen(true)} className={btn('solid', 'lg', 'w-full')}>
          Commander cette configuration
        </button>
        )}
        <p className="text-[12.5px] text-ink-faint mt-2 text-center leading-relaxed">
          Prix indicatif. Le montant définitif vous est confirmé avant tout paiement.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-bg-raised p-4 space-y-3">
      <p className="text-[13px] text-ink-dim leading-relaxed">
        Nous vous rappelons pour confirmer le montant, estimé à{' '}
        <span className="text-ink font-semibold">{formatAmount(estimatedTotal)} FCFA</span>. Rien
        n&apos;est à payer maintenant.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Votre nom"
          required
          className="px-3.5 py-2.5 border border-border rounded-lg bg-bg text-[14px] focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Téléphone"
          // Le seul moyen de vous joindre : aucun envoi d'e-mail ni de SMS
          // n'existe dans le projet.
          required
          inputMode="tel"
          className="px-3.5 py-2.5 border border-border rounded-lg bg-bg text-[14px] focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Ville"
          className="px-3.5 py-2.5 border border-border rounded-lg bg-bg text-[14px] focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Quartier ou repère"
          className="px-3.5 py-2.5 border border-border rounded-lg bg-bg text-[14px] focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        placeholder="Une exigence particulière ? Décrivez la ici."
        className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg text-[14px] focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {error && (
        <p className="flex items-start gap-2 text-[13px] text-danger">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <button type="submit" disabled={sending} className={btn('solid', 'lg', 'w-full')}>
        {sending ? 'Enregistrement…' : 'Valider ma commande'}
      </button>
      <p className="text-[12px] text-ink-faint text-center">
        Aucun paiement à cette étape.
      </p>
    </form>
  )
}
