'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

interface FAQItem {
  question: string
  answer: string
}

/**
 * Questions de secours.
 *
 * Les vraies vivent en base (migration 023) pour être modifiables depuis
 * l'administration. Cette liste sert le temps du chargement, et si la base ne
 * répond pas — une page d'aide vide serait pire qu'une page un peu datée.
 */
const FALLBACK_FAQS: FAQItem[] = [
  {
    question: 'Comment passer une commande ?',
    answer: 'Consultez notre catalogue, sélectionnez un produit, ajoutez-le au panier et procédez au paiement. Vous recevrez une confirmation par email.'
  },
  {
    question: 'Quels sont les modes de paiement acceptés ?',
    answer: 'Nous acceptons Wave, Orange Money, MTN Money, Moov Money et les paiements par carte (Visa, Mastercard) via MoneyFusion.'
  },
  {
    question: 'Quelles sont les villes de livraison ?',
    answer: 'Nous livrons à Abidjan, Bouaké, Yamoussoukro, San-Pédro et Daloa. Les frais de livraison varient selon la ville.'
  },
  {
    question: 'Combien de temps pour la livraison ?',
    answer: 'Les délais varient de 2 à 5 jours ouvrables selon votre ville. Vous recevrez un suivi en temps réel via Yango.'
  },
  {
    question: 'Y a-t-il une garantie sur les produits ?',
    answer: 'Oui ! Tous nos produits sont garantis. Les détails spécifiques dépendent du produit et du fabricant.'
  },
  {
    question: 'Puis-je retourner un produit ?',
    answer: 'Oui, vous disposez de 14 jours après réception pour retourner un produit non utilisé. Contactez-nous pour les modalités.'
  },
  {
    question: 'Comment puis-je suivre ma commande ?',
    answer: 'Une fois votre commande expédiée, vous recevrez un numéro de suivi Yango par email et SMS pour suivre votre colis en temps réel.'
  },
  {
    question: 'Avez-vous un support client ?',
    answer: 'Oui ! Vous pouvez nous contacter par email à contact@cacao.ci ou via le formulaire de contact. Réponse sous 24h.'
  }
]

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-bg-raised transition-colors"
      >
        <span className="text-left font-semibold text-ink">{item.question}</span>
        <span className={`text-ink-dim text-xl transform transition-transform ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-border bg-bg-raised text-ink-dim">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>(FALLBACK_FAQS)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('faq_items')
          .select('question, answer')
          .eq('is_visible', true)
          .order('sort_order')
        if (!error && data?.length) setFaqs(data as FAQItem[])
      } catch {
        // On garde la liste de secours : afficher une page d'aide vide serait pire.
      }
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-4">Questions fréquentes</h1>
        <p className="text-ink-dim mb-12">Trouvez réponse à vos questions sur Cacao, nos produits et services.</p>

        <div>
          {faqs.map((faq, index) => (
            <FAQAccordion key={index} item={faq} />
          ))}
        </div>

        <div className="mt-16 p-8 bg-bg-panel rounded-lg border border-border">
          <h2 className="font-serif font-semibold text-xl mb-2">Vous ne trouvez pas votre réponse ?</h2>
          <p className="text-ink-dim mb-4">Contactez-nous directement via le formulaire de contact ou par email.</p>
          <a href="/contact" className="text-ink font-semibold hover:underline">
            Aller au formulaire de contact →
          </a>
        </div>
      </div>

      <Footer />
    </main>
  )
}
