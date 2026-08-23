'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
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
    <div className="border border-[#E8E0D8] rounded-lg mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#FFF9F3] transition-colors"
      >
        <span className="text-left font-semibold text-[#241A14]">{item.question}</span>
        <span className={`text-[#C2410C] text-xl transform transition-transform ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-[#E8E0D8] bg-[#FFF9F3] text-[#5B4B41]">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-4">Questions fréquentes</h1>
        <p className="text-[#5B4B41] mb-12">Trouvez réponse à vos questions sur Cacao, nos produits et services.</p>

        <div>
          {faqs.map((faq, index) => (
            <FAQAccordion key={index} item={faq} />
          ))}
        </div>

        <div className="mt-16 p-8 bg-white rounded-lg border border-[#E8E0D8]">
          <h2 className="font-serif font-semibold text-xl mb-2">Vous ne trouvez pas votre réponse ?</h2>
          <p className="text-[#5B4B41] mb-4">Contactez-nous directement via le formulaire de contact ou par email.</p>
          <a href="/contact" className="text-[#C2410C] font-semibold hover:underline">
            Aller au formulaire de contact →
          </a>
        </div>
      </div>

      <Footer />
    </main>
  )
}
