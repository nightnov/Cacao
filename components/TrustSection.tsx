import React from 'react'

export function TrustSection() {
  return (
    <section className="bg-bg-panel border-t border-b border-border">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 py-7 grid grid-cols-3 gap-6">
        <div className="text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.8" className="mx-auto mb-2">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          {/* Aucun transporteur n'est nommé : le livreur est choisi commande
              par commande, et citer une société avec qui aucun accord n'existe
              l'engagerait sans son consentement. */}
          <div className="font-semibold text-sm">Livraison suivie</div>
          <small className="text-xs text-ink-dimmer underline decoration-dotted">Partout à Abidjan</small>
        </div>

        <div className="text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.8" className="mx-auto mb-2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div className="font-semibold text-sm">Garantie</div>
          <small className="text-xs text-ink-dimmer underline decoration-dotted">Sur chaque appareil</small>
        </div>

        <div className="text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDC700" strokeWidth="1.8" className="mx-auto mb-2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div className="font-semibold text-sm">Paiement sécurisé</div>
          <small className="text-xs text-ink-dimmer underline decoration-dotted">Via MoneyFusion</small>
        </div>
      </div>
    </section>
  )
}
