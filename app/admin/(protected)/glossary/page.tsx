import { GlossaryPanel } from '@/components/admin/GlossaryPanel'

export const metadata = { title: 'Glossaire des composants' }

export default function GlossaryAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-ink">Glossaire</h1>
        <p className="text-sm text-ink-dimmer mt-1">
          Les explications affichées dans la section Description de chaque fiche, pour le
          client qui ne sait pas ce qu&apos;est une mémoire vive ou un processeur. Un seul
          texte par pièce sert tout le catalogue : ajouter un produit ne demande aucune
          ressaisie, et corriger une explication ici la corrige partout.
        </p>
      </div>

      <GlossaryPanel />
    </div>
  )
}
