'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { btn } from '@/lib/ui'

/**
 * Saisie du code par le livreur.
 *
 * Volontairement réduite à un champ et un bouton : cette page est ouverte sur
 * un téléphone, debout devant une porte, souvent par quelqu'un qui la découvre.
 * Tout ce qui n'est pas le code est du bruit.
 */
export function DeliveryConfirmForm({ token }: { token: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Confirmation impossible.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation impossible.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 size={44} strokeWidth={1.6} className="text-success mx-auto mb-3" />
        <p className="font-semibold text-ink text-lg">Livraison confirmée</p>
        <p className="text-ink-dim text-sm mt-1">Merci, vous pouvez fermer cette page.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-semibold text-ink mb-2">
          Code à quatre chiffres remis par le client
        </label>
        <input
          id="code"
          // `inputMode` fait apparaître le pavé numérique du téléphone : sans
          // lui, le livreur reçoit un clavier de lettres pour saisir un nombre.
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="0000"
          className="w-full text-center text-3xl tracking-[0.4em] font-bold tabular-nums
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

      <button type="submit" disabled={code.length !== 4 || sending} className={btn('solid', 'lg', 'w-full')}>
        {sending ? 'Confirmation…' : 'Confirmer la livraison'}
      </button>

      <p className="text-[12.5px] text-ink-faint text-center">
        Demandez le code au client au moment où vous lui remettez le colis.
      </p>
    </form>
  )
}
