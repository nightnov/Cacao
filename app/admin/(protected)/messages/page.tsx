'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'

interface RawMessage {
  id: string
  user_id: string
  sender: 'customer' | 'admin'
  body: string
  product_name: string | null
  read_by_admin: boolean
  created_at: string
  profiles?: { email: string; first_name: string; last_name: string } | { email: string; first_name: string; last_name: string }[]
}

interface Conversation {
  userId: string
  customerName: string
  email: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: RawMessage[]
}

function getProfile(m: RawMessage) {
  return Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('messages')
        .select('id, user_id, sender, body, product_name, read_by_admin, created_at, profiles(email, first_name, last_name)')
        .order('created_at', { ascending: true })

      if (error) throw error

      const grouped = new Map<string, RawMessage[]>()
      for (const msg of (data || []) as RawMessage[]) {
        if (!grouped.has(msg.user_id)) grouped.set(msg.user_id, [])
        grouped.get(msg.user_id)!.push(msg)
      }

      const convos: Conversation[] = Array.from(grouped.entries()).map(([userId, msgs]) => {
        const last = msgs[msgs.length - 1]
        const profile = getProfile(last)
        const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : 'Client'
        return {
          userId,
          customerName: name,
          email: profile?.email || '',
          lastMessage: last.body,
          lastMessageAt: last.created_at,
          unreadCount: msgs.filter(m => m.sender === 'customer' && !m.read_by_admin).length,
          messages: msgs
        }
      })

      convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      setConversations(convos)
    } catch (err) {
      console.error('Erreur chargement messages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedUserId])

  const selectedConvo = conversations.find(c => c.userId === selectedUserId)

  const handleSelect = async (userId: string) => {
    setSelectedUserId(userId)

    const convo = conversations.find(c => c.userId === userId)
    if (!convo || convo.unreadCount === 0) return

    try {
      const supabase = getSupabaseClient()
      await supabase
        .from('messages')
        .update({ read_by_admin: true })
        .eq('user_id', userId)
        .eq('sender', 'customer')
        .eq('read_by_admin', false)

      setConversations(prev =>
        prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
      )
    } catch (err) {
      console.error('Erreur marquage lu:', err)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUserId) return

    setSending(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('messages').insert([{
        user_id: selectedUserId,
        sender: 'admin',
        body: reply.trim()
      }])

      if (error) throw error

      setReply('')
      await fetchConversations()
    } catch (err) {
      console.error('Erreur envoi réponse:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A] mb-8">Messages</h1>

      {loading ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-12 text-center">
          <p className="text-[#56534C]">Chargement...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-12 text-center">
          <p className="text-[#56534C]">Aucun message pour l&apos;instant</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-lg border border-[#E4DDCF] overflow-hidden" style={{ height: '70vh' }}>
          {/* Conversation list */}
          <div className="md:col-span-1 border-r border-[#E4DDCF] overflow-y-auto">
            {conversations.map(convo => (
              <button
                key={convo.userId}
                onClick={() => handleSelect(convo.userId)}
                className={`w-full text-left px-4 py-4 border-b border-[#E4DDCF] hover:bg-[#FBF6EE] transition-colors ${
                  selectedUserId === convo.userId ? 'bg-[#FBF6EE]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#1A1A1A] truncate">{convo.customerName}</span>
                  {convo.unreadCount > 0 && (
                    <span className="bg-[#E85D25] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8A8579] truncate">{convo.lastMessage}</p>
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="md:col-span-2 flex flex-col">
            {selectedConvo ? (
              <>
                <div className="px-6 py-4 border-b border-[#E4DDCF]">
                  <p className="font-semibold text-[#1A1A1A]">{selectedConvo.customerName}</p>
                  <p className="text-xs text-[#8A8579]">{selectedConvo.email}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedConvo.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                        msg.sender === 'admin' ? 'bg-[#E85D25] text-white' : 'bg-[#FBF6EE] text-[#1A1A1A]'
                      }`}>
                        {msg.product_name && (
                          <p className={`text-xs mb-1 font-semibold ${msg.sender === 'admin' ? 'text-white/80' : 'text-[#8A8579]'}`}>
                            📦 {msg.product_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-white/70' : 'text-[#8A8579]'}`}>
                          {new Date(msg.created_at).toLocaleString('fr-CI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef}></div>
                </div>

                <form onSubmit={handleReply} className="border-t border-[#E4DDCF] p-4 flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Répondre..."
                    className="flex-1 px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25] resize-none text-sm"
                  />
                  <Button type="submit" variant="primary" disabled={sending || !reply.trim()}>
                    Envoyer
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8A8579] text-sm">
                Sélectionnez une conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
