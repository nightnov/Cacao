import React from 'react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E4DDCF] px-10 py-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
        <div className="font-serif font-bold text-xl">Cacao</div>
        <div className="text-xs text-[#8A8579]">
          Abidjan, Côte d&apos;Ivoire · Paiement sécurisé MoneyFusion
        </div>
      </div>
    </footer>
  )
}
