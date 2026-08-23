'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { getSupabaseClient } from '@/lib/supabase'

type CheckState = 'checking' | 'paid' | 'pending' | 'failed' | 'not_found'

function ReturnContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const [state, setState] = useState<CheckState>('checking')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!orderNumber) {
      setState('not_found')
      return
    }

    let cancelled = false

    const checkStatus = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('order_number', orderNumber)
          .maybeSingle()

        if (error) throw error
        if (cancelled) return

        if (!data) {
          setState('not_found')
          return
        }

        if (data.status === 'confirmed' || data.status === 'preparing' || data.status === 'shipped' || data.status === 'delivered') {
          setState('paid')
        } else if (data.status === 'cancelled' || data.status === 'refunded') {
          setState('failed')
        } else {
          // Toujours 'pending': le webhook n'est peut-être pas encore arrivé,
          // on retente quelques fois avant d'afficher un état d'attente définitif.
          setAttempts(prev => {
            const next = prev + 1
            if (next < 6) {
              setTimeout(checkStatus, 2000)
            } else {
              setState('pending')
            }
            return next
          })
        }
      } catch (err) {
        console.error('Erreur vérification statut:', err)
        if (!cancelled) setState('pending')
      }
    }

    checkStatus()
    return () => { cancelled = true }
  }, [orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-[#1C2021] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-24 text-center">
        <div className="bg-[#1C2021] rounded-lg border border-[#35383C] p-8">
          {state === 'checking' && (
            <>
              <div className="w-10 h-10 border-4 border-[#FDC700] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-2">Vérification du paiement...</h1>
              <p className="text-[#B3B8BE]">Merci de patienter quelques instants.</p>
            </>
          )}

          {state === 'paid' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3FCE7A" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-2">Paiement confirmé !</h1>
              <p className="text-[#B3B8BE] mb-8">
                Votre commande <strong>{orderNumber}</strong> est confirmée. Vous recevrez bientôt des nouvelles de la livraison.
              </p>
              <Link href="/account">
                <Button variant="primary">Voir mes commandes</Button>
              </Link>
            </>
          )}

          {state === 'pending' && (
            <>
              <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-2">Paiement en cours de traitement</h1>
              <p className="text-[#B3B8BE] mb-8">
                Votre commande <strong>{orderNumber}</strong> est enregistrée. La confirmation du paiement peut prendre quelques minutes. Vous pouvez suivre son statut dans votre compte.
              </p>
              <Link href="/account">
                <Button variant="outline">Voir mes commandes</Button>
              </Link>
            </>
          )}

          {state === 'failed' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-2">Paiement annulé</h1>
              <p className="text-[#B3B8BE] mb-8">
                Le paiement de la commande <strong>{orderNumber}</strong> n&apos;a pas abouti. Vous pouvez réessayer depuis votre panier.
              </p>
              <Link href="/cart">
                <Button variant="primary">Retour au panier</Button>
              </Link>
            </>
          )}

          {state === 'not_found' && (
            <>
              <h1 className="font-serif font-semibold text-2xl text-[#EEF2F7] mb-2">Commande introuvable</h1>
              <p className="text-[#B3B8BE] mb-8">Nous n&apos;avons pas pu retrouver cette commande.</p>
              <Link href="/account">
                <Button variant="outline">Voir mes commandes</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function CheckoutReturn() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#1C2021]" />}>
      <ReturnContent />
    </Suspense>
  )
}
