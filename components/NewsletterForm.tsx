'use client'

import React, { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Inscription à la lettre d'information.
 *
 * Extrait de la page d'accueil quand celle ci est passée en rendu serveur :
 * c'est le seul bloc de la page qui ait besoin de réagir à une saisie. Le
 * reste s'affiche déjà complet, sans attendre le navigateur.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: email.trim() }])
      // 23505 : adresse déjà inscrite. Ce n'est pas un échec du point de vue
      // du visiteur, qui voulait précisément être dans la liste.
      if (error && error.code !== '23505') throw error
      setStatus('success')
      setEmail('')
    } catch (err) {
      console.error('Erreur newsletter:', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p className="text-green-bright font-bold text-sm">✓ Merci, vous êtes inscrit(e) !</p>
  }

  return (
    <>
      <form onSubmit={submit} className="flex items-center justify-center gap-2.5 max-w-md mx-auto flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Votre adresse e-mail"
          className="flex-1 min-w-[200px] px-4 py-3 bg-bg-raised border border-border-mid focus:border-border-strong rounded-lg text-[13px] text-ink outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3 bg-ink hover:bg-ink-dim text-ink-invert rounded-lg font-bold text-[13px] transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Envoi…' : 'S’abonner'}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-danger text-[12.5px] mt-3">Une erreur est survenue, réessayez.</p>
      )}
    </>
  )
}
