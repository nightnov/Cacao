'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function About() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">À propos de Cacao</h1>

        <div className="prose prose-sm max-w-none">
          <p className="text-ink-dim leading-relaxed mb-6">
            Cacao est une plateforme de commerce électronique dédiée aux ordinateurs et équipements informatiques de qualité en Côte d&apos;Ivoire. Nous croyons que chacun mérite l&apos;accès à des outils technologiques fiables, performants et à des prix justes.
          </p>

          <h2 className="font-serif font-semibold text-2xl text-ink mt-8 mb-4">Notre mission</h2>
          <p className="text-ink-dim leading-relaxed mb-6">
            Simplifier l&apos;accès aux ordinateurs portables, de bureau et accessoires de qualité. Nous sélectionnons chaque produit avec soin pour garantir performance, durabilité et compatibilité avec les besoins des utilisateurs ivoiriens.
          </p>

          <h2 className="font-serif font-semibold text-2xl text-ink mt-8 mb-4">Nos valeurs</h2>
          <ul className="text-ink-dim leading-relaxed mb-6 list-disc list-inside space-y-2">
            <li><strong>Qualité :</strong> Pas de compromis sur la fiabilité des produits</li>
            <li><strong>Transparence :</strong> Prix affichés clairement, pas de frais cachés</li>
            <li><strong>Rapidité :</strong> Livraison confiée à un partenaire dès la commande préparée</li>
            <li><strong>Service :</strong> Support client réactif et disponible</li>
          </ul>

          <h2 className="font-serif font-semibold text-2xl text-ink mt-8 mb-4">Paiements sécurisés</h2>
          <p className="text-ink-dim leading-relaxed mb-6">
            Nous acceptons Wave, Orange Money, MTN Money, Moov Money et les paiements par carte via MoneyFusion. Vos transactions sont chiffrées et protégées.
          </p>

          {/* Ni transporteur nommé, ni « suivi en temps réel » : l'état de la
              commande est mis à jour à la main depuis l'administration, et le
              seul engagement réel est le code remis au livreur. */}
          <h2 className="font-serif font-semibold text-2xl text-ink mt-8 mb-4">Livraison</h2>
          <p className="text-ink-dim leading-relaxed">
            Nous livrons à Abidjan et dans les villes desservies par nos partenaires de
            livraison. Les frais et les villes couvertes s&apos;affichent au moment de la
            commande. Vous suivez l&apos;avancement depuis votre compte, et un code vous est
            demandé à la remise du colis.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
