'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function Cart() {
  return (
    <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Votre panier</h1>

        <div className="bg-white rounded-lg border border-[#E4DDCF] p-8 text-center">
          <div className="mb-6">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E85D25"
              strokeWidth="1.5"
              className="mx-auto mb-4"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-3">Panier vide</h2>
          <p className="text-[#56534C] mb-8">Explorez notre catalogue et ajoutez vos produits préférés.</p>
          <Link href="/">
            <Button variant="primary">Continuer les achats</Button>
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  )
}
