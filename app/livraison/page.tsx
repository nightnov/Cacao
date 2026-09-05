import { DeliveryConfirmForm } from '@/components/DeliveryConfirmForm'
import { CARD } from '@/lib/ui'
import { PackageCheck } from 'lucide-react'
import type { Metadata } from 'next'

/**
 * Page du livreur.
 *
 * Une seule adresse, la même pour tous les colis : le livreur l'enregistre une
 * fois et s'en sert à chaque livraison. Un lien par commande avait été
 * construit d'abord ; il était sûr mais demandait de retrouver et transmettre
 * une adresse différente à chaque fois, ce qui ne tient pas à l'usage.
 *
 * Elle est ouverte sur un téléphone, debout devant une porte, par quelqu'un
 * qui n'a pas de compte. D'où l'absence d'en tête et de menu : tout lien vers
 * le reste du site l'éloignerait de la seule action attendue.
 *
 * Rien n'est affiché avant qu'un code juste soit saisi — ni nom, ni adresse,
 * ni montant. Un essai raté n'apprend donc même pas qu'une commande existe.
 */

// Sans en tête ni contenu variable, la page peut être servie telle quelle.
export const dynamic = 'force-static'

// Une page de confirmation n'a rien à faire dans un moteur de recherche : la
// laisser indexer reviendrait à publier l'adresse à essayer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Confirmation de livraison'
}

export default function DeliveryPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <PackageCheck size={34} strokeWidth={1.6} className="text-accent mx-auto mb-3" />
          <h1 className="font-serif font-semibold text-2xl text-ink">Confirmation de livraison</h1>
          <p className="text-ink-dim text-sm mt-2 leading-relaxed">
            Remettez le colis au client, demandez lui son code, puis saisissez le ici.
          </p>
        </div>

        <div className={`${CARD} p-5`}>
          <DeliveryConfirmForm />
        </div>
      </div>
    </main>
  )
}
