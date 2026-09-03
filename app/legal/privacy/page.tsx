'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function Privacy() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Politique de confidentialité</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-ink-dim">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">1. Données collectées</h2>
            <p>
              Cacao collecte les données personnelles que vous nous fournissez volontairement lors de votre inscription, vos commandes et vos interactions avec notre plateforme :
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Nom, prénom, email, téléphone</li>
              <li>Adresse de livraison et informations de facturation</li>
              <li>Historique de commandes et préférences de produits</li>
              <li>Données de paiement (traitées sécurisément via MoneyFusion)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">2. Utilisation de vos données</h2>
            <p>
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Traiter vos commandes et livraisons</li>
              <li>Vous envoyer des confirmations et suivis de commande</li>
              <li>Améliorer nos services et votre expérience utilisateur</li>
              <li>Vous informer des nouveautés (si vous acceptez)</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">3. Protection de vos données</h2>
            <p>
              Nous utilisons le chiffrement SSL/TLS pour protéger vos données en transit. Vos données de paiement sont traitées par MoneyFusion, notre partenaire de confiance, qui respecte les normes PCI-DSS.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">4. Partage de données</h2>
            <p>
              Nous ne partageons vos données que si nécessaire avec nos partenaires de service (Yango pour livraison, MoneyFusion pour paiement). Nous ne vendons jamais vos données personnelles.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">5. Vos droits</h2>
            <p>
              Vous avez le droit d&apos;accéder, corriger ou supprimer vos données personnelles. Contactez-nous à contact@cacao.ci pour exercer ces droits.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">6. Cookies</h2>
            <p>
              Notre site utilise des cookies pour améliorer votre expérience. Vous pouvez les désactiver dans les paramètres de votre navigateur, mais certaines fonctionnalités pourraient ne pas fonctionner correctement.
            </p>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-2xl text-ink mb-3">7. Modifications</h2>
            <p>
              Cette politique peut être mise à jour à tout moment. La dernière modification date de : août 2026.
            </p>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm">
              Pour toute question sur notre politique de confidentialité, contactez-nous à contact@cacao.ci
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
