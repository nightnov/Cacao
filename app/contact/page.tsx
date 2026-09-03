'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { useShopInfo } from '@/hooks/useShopInfo'
import { getSupabaseClient } from '@/lib/supabase'

export default function Contact() {
  const { user, isLoggedIn, loading: authLoading } = useAuth()
  const shop = useShopInfo()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  /**
   * Le message part dans la table `messages`, celle que lit l'administration.
   *
   * Avant, ce formulaire affichait « Merci pour votre message ! » sans rien
   * envoyer nulle part : les champs n'étaient même pas reliés à un état. Tout
   * ce que les clients ont écrit ici a été perdu.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setSending(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      // La table n'a pas de colonne « sujet » : on le place en tête du corps
      // plutôt que d'ajouter une colonne pour une seule ligne de texte.
      const { error: insertError } = await supabase.from('messages').insert({
        user_id: user.id,
        sender: 'customer',
        body: subject.trim() ? `${subject.trim()}\n\n${body.trim()}` : body.trim(),
        read_by_admin: false,
        read_by_customer: true,
      })
      if (insertError) throw new Error(insertError.message)
      setSent(true)
      setSubject('')
      setBody('')
    } catch (err: any) {
      setError(
        err.message || "Votre message n'a pas pu être envoyé. Réessayez ou écrivez-nous directement."
      )
    } finally {
      setSending(false)
    }
  }

  const waDigits = (shop.whatsapp || shop.phone).replace(/\D/g, '')
  const waLink = waDigits.length >= 8
    ? `https://wa.me/${waDigits.startsWith('225') ? waDigits : `225${waDigits}`}`
    : null

  const field =
    'w-full px-4 py-2.5 bg-bg-raised border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent'

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Nous contacter</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <h2 className="font-serif font-semibold text-xl mb-6">Informations de contact</h2>

            <div className="space-y-6">
              {/* Chaque coordonnée ne s'affiche que si elle est renseignée :
                  un bloc vide vaut mieux qu'un numéro de remplacement. */}
              {shop.email && (
                <div>
                  <h3 className="font-semibold text-ink mb-2">Email</h3>
                  <a href={`mailto:${shop.email}`} className="text-ink-dim hover:text-ink">
                    {shop.email}
                  </a>
                </div>
              )}

              {shop.phone && (
                <div>
                  <h3 className="font-semibold text-ink mb-2">Téléphone</h3>
                  <a
                    href={`tel:${shop.phone.replace(/\s/g, '')}`}
                    className="text-ink-dim hover:text-ink"
                  >
                    {shop.phone}
                  </a>
                </div>
              )}

              {waLink && (
                <div>
                  <h3 className="font-semibold text-ink mb-2">WhatsApp</h3>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink font-semibold hover:underline"
                  >
                    Ouvrir une discussion →
                  </a>
                </div>
              )}

              {shop.address && (
                <div>
                  <h3 className="font-semibold text-ink mb-2">Adresse</h3>
                  <p className="text-ink-dim">{shop.address}</p>
                </div>
              )}

              {!shop.email && !shop.phone && !shop.address && (
                <p className="text-ink-dimmer text-sm">
                  Les coordonnées ne sont pas encore renseignées. Utilisez le formulaire ci-contre.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-xl mb-6">Envoyez-nous un message</h2>

            {sent ? (
              <div className="bg-green/10 border border-green rounded-lg p-5">
                <p className="text-ink font-semibold mb-1">Message envoyé.</p>
                <p className="text-ink-dim text-sm">
                  Il est arrivé dans notre messagerie. Vous retrouverez la réponse dans{' '}
                  <Link href="/account/messages" className="text-ink hover:underline">
                    vos messages
                  </Link>
                  .
                </p>
              </div>
            ) : authLoading ? (
              <p className="text-ink-dimmer text-sm">Chargement…</p>
            ) : !isLoggedIn ? (
              <div className="bg-bg-raised border border-border rounded-lg p-5">
                <p className="text-ink-dim text-sm mb-4">
                  Connectez-vous pour nous écrire : votre message arrive dans votre espace client,
                  où vous retrouverez notre réponse.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/account/login">
                    <Button variant="solid">Se connecter</Button>
                  </Link>
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="sober">Écrire sur WhatsApp</Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-ink mb-2">
                    Sujet
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className={field}
                    placeholder="Sujet du message"
                  />
                </div>

                <div>
                  <label htmlFor="body" className="block text-sm font-semibold text-ink mb-2">
                    Message
                  </label>
                  <textarea
                    id="body"
                    required
                    rows={6}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className={field}
                    placeholder="Votre message..."
                  />
                </div>

                {error && <p className="text-danger text-sm">{error}</p>}

                <Button
                  type="submit"
                  variant="solid"
                  className="w-full"
                  disabled={sending || !body.trim()}
                >
                  {sending ? 'Envoi…' : 'Envoyer'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
