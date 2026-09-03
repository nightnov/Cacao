'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'

interface Message {
  id: string
  sender: 'customer' | 'admin'
  body: string
  product_name: string | null
  created_at: string
}

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, isLoggedIn } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const productId = searchParams.get('productId')
  const productName = searchParams.get('productName')

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push(`/account/login`)
    }
  }, [authLoading, isLoggedIn, router])

  useEffect(() => {
    if (productName && !body) {
      setBody(`Question à propos de "${productName}" : `)
    }
  }, [productName]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMessages = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender, body, product_name, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      const unreadIds = (data || []).filter((m: any) => m.sender === 'admin' && !m.read_by_customer)
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_by_customer: true })
          .eq('sender', 'admin')
          .eq('read_by_customer', false)
      }
    } catch (err) {
      console.error('Erreur chargement messages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) fetchMessages()
  }, [isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setSending(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('messages').insert([{
        user_id: user.id,
        sender: 'customer',
        body: body.trim(),
        product_id: productId || null,
        product_name: productName || null
      }])

      if (error) throw error

      setBody('')
      router.replace('/account/messages')
      await fetchMessages()
    } catch (err) {
      console.error('Erreur envoi message:', err)
    } finally {
      setSending(false)
    }
  }

  if (authLoading || !isLoggedIn) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ink-dim border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto px-5 sm:px-10 py-16 w-full flex flex-col">
        <h1 className="font-serif font-semibold text-4xl mb-8">Messages</h1>

        <div className="bg-bg-panel rounded-lg border border-border flex flex-col flex-1 min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[50vh]">
            {loading ? (
              <p className="text-sm text-ink-dimmer text-center">Chargement...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-ink-dimmer text-center py-8">
                Aucun message pour l&apos;instant. Écrivez-nous si vous avez une question !
              </p>
            ) : (
              messages.map(msg => {
                const fromCustomer = msg.sender === 'customer'
                /**
                 * Les couleurs secondaires se déduisent du fond de LA BULLE, et
                 * non du thème de la page.
                 *
                 * La bulle du client était claire et sa date écrite en
                 * `text-white/70` : blanc sur blanc, donc invisible. Chaque
                 * teinte est désormais choisie face au fond sur lequel elle se
                 * pose réellement.
                 *
                 * Client : bulle sombre bleutée, texte clair.
                 * Boutique : bulle claire, texte foncé.
                 */
                const bubble = fromCustomer
                  ? 'bg-accent/15 border border-accent/30 text-ink'
                  : 'bg-ink border border-ink text-ink-invert'
                const secondary = fromCustomer ? 'text-ink-dimmer' : 'text-ink-invert/70'

                return (
                  <div key={msg.id} className={`flex ${fromCustomer ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 ${bubble}`}>
                      {msg.product_name && (
                        <p className={`text-xs mb-1 font-semibold ${secondary}`}>
                          📦 {msg.product_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1 ${secondary}`}>
                        {new Date(msg.created_at).toLocaleString('fr-CI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef}></div>
          </div>

          <form onSubmit={handleSend} className="border-t border-border p-4 flex gap-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Écrivez votre message..."
              className="flex-1 px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm"
            />
            <Button type="submit" variant="solid" disabled={sending || !body.trim()}>
              Envoyer
            </Button>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function Messages() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <MessagesContent />
    </Suspense>
  )
}
