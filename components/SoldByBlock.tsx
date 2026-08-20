import { ShieldCheck } from 'lucide-react'

// Composant réutilisable: aujourd'hui tous les produits sont vendus par CACAO.
// Structuré pour accueillir plus tard un vrai vendeur tiers (nom, note, lien boutique)
// sans changer les pages qui l'utilisent.
export function SoldByBlock() {
  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#E4DDCF]">
      <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
        <ShieldCheck size={16} className="text-[#FF6600]" />
      </div>
      <div>
        <p className="text-sm text-[#1A1A1A]">
          Vendu et expédié par <span className="font-semibold">CACAO</span>
        </p>
        <p className="text-xs text-[#8A8579]">Produit vérifié, livraison suivie</p>
      </div>
    </div>
  )
}
