'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { btn } from '@/lib/ui'

/**
 * Saisie du code par le livreur.
 *
 * Volontairement réduite à un champ et un bouton : cette page est ouverte sur
 * un téléphone, debout devant une porte, souvent par quelqu'un qui la découvre.
 * Tout ce qui n'est pas le code est du bruit.
 */
interface Confirmed {
  order_number: string
  recipient: string | null
}

export function DeliveryConfirmForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null)
  const [scanne, setScanne] = useState(false)

  /**
   * Code apporté par le QR que le client vient de montrer.
   *
   * Il remplit le champ, il ne valide pas à la place du livreur. Un scan
   * réussi n'est pas une remise : le bouton reste à presser, une fois le colis
   * effectivement dans les mains du client. Confirmer automatiquement
   * reviendrait à valider une livraison depuis le trottoir.
   *
   * L'adresse est nettoyée dans la foulée : le code cesse d'exister dans
   * l'historique du navigateur du livreur, où il n'a rien à faire.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const recu = (params.get('c') || '').replace(/\D/g, '').slice(0, 6)
    if (!recu) return
    setCode(recu)
    setScanne(true)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Confirmation impossible.')
      setConfirmed({ order_number: data.order_number, recipient: data.recipient })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation impossible.')
    } finally {
      setSending(false)
    }
  }

  if (confirmed) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 size={44} strokeWidth={1.6} className="text-success mx-auto mb-3" />
        <p className="font-semibold text-ink text-lg">Livraison confirmée</p>
        {/* Le nom n'apparaît qu'ici, après un code juste : il sert au livreur à
            vérifier qu'il est chez la bonne personne, et un essai raté ne
            révèle jamais l'identité de qui que ce soit. */}
        {confirmed.recipient && (
          <p className="text-ink text-sm mt-2">{confirmed.recipient}</p>
        )}
        <p className="text-ink-dim text-sm mt-1 tabular-nums">
          Commande {confirmed.order_number}
        </p>
        <p className="text-ink-faint text-[12.5px] mt-4">Vous pouvez fermer cette page.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-semibold text-ink mb-2">
          Code remis par le client
        </label>
        <input
          id="code"
          // `inputMode` fait apparaître le pavé numérique du téléphone : sans
          // lui, le livreur reçoit un clavier de lettres pour saisir un nombre.
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full text-center text-3xl tracking-[0.3em] font-bold tabular-nums
                     px-4 py-4 border border-border-strong rounded-xl bg-bg
                     focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Quatre chiffres restent acceptés : les commandes antérieures en
          portent un, et refuser leur code bloquerait ces livraisons. */}
      <button type="submit" disabled={code.length < 4 || sending} className={btn('solid', 'lg', 'w-full')}>
        {sending ? 'Vérification…' : 'Confirmer la livraison'}
      </button>

      <p className="text-[12.5px] text-ink-faint text-center">
        {scanne
          ? 'Code lu. Confirmez une fois le colis remis au client.'
          : 'Demandez le code au client au moment où vous lui remettez le colis. Il peut aussi vous montrer son QR à scanner.'}
      </p>
    </form>
  )
}
