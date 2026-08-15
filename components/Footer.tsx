import React from 'react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E4DDCF] mt-20">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-10 py-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
        {/* Branding */}
        <div>
          <Link href="/" className="font-serif font-bold text-2xl text-[#1A1A1A] hover:opacity-80">
            Cacao
          </Link>
          <p className="text-sm text-[#56534C] mt-4 leading-relaxed">
            Ordinateurs de qualité à prix justes, livrés partout en Côte d&apos;Ivoire.
          </p>
        </div>

        {/* Produits */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Produits</h3>
          <ul className="space-y-3">
            <li>
              <Link href="/products?category=portable" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Portables
              </Link>
            </li>
            <li>
              <Link href="/products?category=bureau" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Ordinateurs de bureau
              </Link>
            </li>
            <li>
              <Link href="/products?category=accessoire" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Accessoires
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Support</h3>
          <ul className="space-y-3">
            <li>
              <Link href="/faq" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                À propos
              </Link>
            </li>
          </ul>
        </div>

        {/* Légal */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Légal</h3>
          <ul className="space-y-3">
            <li>
              <Link href="/legal/terms" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Conditions d&apos;utilisation
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-[#E4DDCF] px-10 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#8A8579]">
          <p>© 2026 Cacao. Tous droits réservés.</p>
          <p>Abidjan, Côte d&apos;Ivoire · Paiement sécurisé via MoneyFusion</p>
        </div>
      </div>
    </footer>
  )
}
