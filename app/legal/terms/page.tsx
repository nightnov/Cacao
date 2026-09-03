'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function Terms() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Conditions d&apos;utilisation</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-ink-dim">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">1. Acceptation des conditions</h2>
            <p>
              En utilisant Cacao, vous acceptez ces conditions d&apos;utilisation. Si vous n&apos;êtes pas d&apos;accord, veuillez ne pas utiliser nos services.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">2. Utilisation de la plateforme</h2>
            <p>
              Vous vous engagez à :
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Fournir des informations exactes et à jour</li>
              <li>Utiliser le site de manière légale et respectueuse</li>
              <li>Ne pas accéder sans autorisation aux données ou aux systèmes</li>
              <li>Ne pas interférer avec le fonctionnement du site</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">3. Produits et prix</h2>
            <p>
              Nous nous efforçons de maintenir des informations précises sur nos produits et prix. Cependant, des erreurs peuvent survenir. Nous nous réservons le droit de corriger tout prix ou description erronée avant votre paiement.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">4. Processus de commande</h2>
            <p>
              Chaque commande constitue une offre d&apos;achat. Cacao accepte ou rejette votre commande à sa discrétion. Une confirmation par email signifie l&apos;acceptation de votre commande.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">5. Paiement</h2>
            <p>
              Les paiements doivent être effectués via les méthodes autorisées (Wave, Orange Money, MTN Money, Moov Money, carte bancaire). Les transactions sont traitées par MoneyFusion de manière sécurisée.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">6. Livraison</h2>
            <p>
              Nous livrons aux adresses précédemment mentionnées. Les délais de livraison sont estimatifs et non garantis. Cacao ne sera pas responsable des retards causés par des tiers (Yango, conditions météorologiques, etc.).
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">7. Retours et remboursements</h2>
            <p>
              Vous avez 14 jours après réception pour retourner un produit non utilisé. Les retours doivent être initiés via notre formulaire de contact. Les remboursements sont traités sous 7-10 jours ouvrables.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">8. Limite de responsabilité</h2>
            <p>
              Cacao ne sera pas responsable des dommages indirects, consécutifs ou exemplaires. Notre responsabilité est limitée au montant payé pour la commande.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">9. Propriété intellectuelle</h2>
            <p>
              Tout contenu sur Cacao (logos, images, textes) est protégé par les droits d&apos;auteur. Vous ne pouvez pas le reproduire sans permission.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">10. Modifications</h2>
            <p>
              Cacao peut modifier ces conditions à tout moment. Vous serez informé des modifications importantes. La dernière modification date de : août 2026.
            </p>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm">
              Pour toute question sur nos conditions d&apos;utilisation, contactez-nous à contact@cacao.ci
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
