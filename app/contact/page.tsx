'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'

export default function Contact() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    alert('Merci pour votre message ! Nous vous répondrons très bientôt.')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Nous contacter</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Contact info */}
          <div>
            <h2 className="font-serif font-semibold text-xl mb-6">Informations de contact</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-[#241A14] mb-2">Email</h3>
                <p className="text-[#5B4B41]">contact@cacao.ci</p>
              </div>

              <div>
                <h3 className="font-semibold text-[#241A14] mb-2">Téléphone</h3>
                <p className="text-[#5B4B41]">+225 07 XX XX XX XX</p>
              </div>

              <div>
                <h3 className="font-semibold text-[#241A14] mb-2">Siège social</h3>
                <p className="text-[#5B4B41]">Abidjan, Côte d&apos;Ivoire</p>
              </div>

              <div>
                <h3 className="font-semibold text-[#241A14] mb-2">Horaires</h3>
                <p className="text-[#5B4B41]">Lundi - Samedi : 9h - 18h</p>
                <p className="text-[#5B4B41]">Dimanche : Fermé</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="font-serif font-semibold text-xl mb-6">Envoyez-nous un message</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Nom</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Sujet</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Sujet du message"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Votre message..."
                />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Envoyer
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
