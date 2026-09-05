'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { getSupabaseClient } from '@/lib/supabase'

type CheckState = 'checking' | 'paid' | 'pending' | 'failed' | 'not_found'

/**
 * Le code de livraison, montré dès la sortie du paiement.
 *
 * Il n'était visible que dans « Mon compte », après avoir ouvert la commande.
 * Un code qu'on ne sait pas devoir garder est un code perdu : le client range
 * son téléphone en croyant l'affaire close, et le jour de la livraison le
 * livreur attend une preuve que personne ne lui a annoncée.
 */
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6 text-left">
      <p className="text-xs font-semibold text-accent uppercase mb-1 text-center">Code de livraison</p>
      <p className="text-3xl font-bold text-ink tracking-widest mb-2 text-center tabular-nums">{code}</p>
      <p className="text-xs text-ink-dim text-center">
        Notez ce code. Vous le donnez au livreur seulement au moment où il vous remet le colis, jamais
        avant. Vous le retrouvez à tout moment dans « Mon compte », puis « Mes commandes ».
      </p>
    </div>
  )
}

/** Ce qui se passe ensuite, écrit noir sur blanc plutôt que laissé à deviner. */
function NextSteps() {
  return (
    <ol className="text-left text-sm text-ink-dim space-y-2 mb-8 bg-bg-sunken border border-border rounded-lg p-4">
      <li>1. Nous préparons votre commande.</li>
      <li>2. Nous vous appelons pour convenir du jour et du lieu de remise.</li>
      <li>3. À la remise du colis, vous donnez votre code de livraison au livreur.</li>
    </ol>
  )
}

function ReturnContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const [state, setState] = useState<CheckState>('checking')
  const [attempts, setAttempts] = useState(0)
  // Le code de livraison est lu ici et non plus seulement dans le compte.
  // C'est la page où le client atterrit en sortant du paiement : s'il doit
  // aller le chercher lui même dans « Mes commandes », il ne sait pas qu'il
  // existe, et personne ne lui a dit qu'il en aurait besoin à la livraison.
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null)

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
          .select('status, delivery_code')
          .eq('order_number', orderNumber)
          .maybeSingle()

        if (error) throw error
        if (cancelled) return

        if (!data) {
          setState('not_found')
          return
        }

        setDeliveryCode(data.delivery_code ?? null)

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
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-10 py-24 text-center">
        <div className="bg-bg-panel rounded-lg border border-border p-8">
          {state === 'checking' && (
            <>
              <div className="w-10 h-10 border-4 border-ink-dim border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Vérification du paiement...</h1>
              <p className="text-ink-dim">Merci de patienter quelques instants.</p>
            </>
          )}

          {state === 'paid' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green/15 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3FCE7A" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Paiement confirmé !</h1>
              <p className="text-ink-dim mb-6">
                Votre commande <strong>{orderNumber}</strong> est confirmée. Nous vous appelons au numéro
                indiqué pour convenir de la livraison à Abidjan.
              </p>

              {deliveryCode && <CodeBlock code={deliveryCode} />}

              <NextSteps />

              <Link href="/account">
                <Button variant="sober">Voir ma commande</Button>
              </Link>
            </>
          )}

          {state === 'pending' && (
            <>
              <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Paiement en cours de traitement</h1>
              <p className="text-ink-dim mb-6">
                Votre commande <strong>{orderNumber}</strong> est enregistrée. La confirmation du paiement peut
                prendre quelques minutes. Rien n&apos;est perdu : rouvrez la page « Mon compte », puis « Mes
                commandes », et le statut y sera à jour.
              </p>

              {deliveryCode && <CodeBlock code={deliveryCode} />}

              <Link href="/account">
                <Button variant="sober">Voir ma commande</Button>
              </Link>
            </>
          )}

          {state === 'failed' && (
            <>
              <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Paiement annulé</h1>
              <p className="text-ink-dim mb-8">
                Le paiement de la commande <strong>{orderNumber}</strong> n&apos;a pas abouti. Vous pouvez réessayer depuis votre panier.
              </p>
              <Link href="/cart">
                <Button variant="sober">Retour au panier</Button>
              </Link>
            </>
          )}

          {state === 'not_found' && (
            <>
              <h1 className="font-serif font-semibold text-2xl text-ink mb-2">Commande introuvable</h1>
              <p className="text-ink-dim mb-8">Nous n&apos;avons pas pu retrouver cette commande.</p>
              <Link href="/account">
                <Button variant="sober">Voir mes commandes</Button>
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
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <ReturnContent />
    </Suspense>
  )
}
