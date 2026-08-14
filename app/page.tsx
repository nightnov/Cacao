'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TrustSection } from '@/components/TrustSection'
import { Badge } from '@/components/Badge'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBF6EE]">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-10 py-12">
        <Badge>NOUVEAU SUR LE MARCHÉ</Badge>
        <h1 className="font-serif font-semibold text-5xl leading-tight mb-4 max-w-2xl mt-5">
          Des PC pro, à prix <em className="italic text-[#E85D25]">juste.</em>
        </h1>
        <p className="text-[#56534C] text-base max-w-md leading-relaxed">
          Une sélection de machines fiables, choisies pour durer, livrées chez vous en toute confiance.
        </p>
      </section>

      {/* Category strip */}
      <section className="max-w-7xl mx-auto px-10 pb-10 flex gap-3 flex-wrap">
        <div className="border-2 border-[#1A1A1A] rounded-full px-5 py-2.5 text-sm font-semibold cursor-pointer bg-[#1A1A1A] text-[#FBF6EE]">
          Tous
        </div>
        <div className="border-2 border-[#1A1A1A] rounded-full px-5 py-2.5 text-sm font-semibold cursor-pointer bg-white hover:bg-[#1A1A1A] hover:text-[#FBF6EE] transition-colors">
          Portables
        </div>
        <div className="border-2 border-[#1A1A1A] rounded-full px-5 py-2.5 text-sm font-semibold cursor-pointer bg-white hover:bg-[#1A1A1A] hover:text-[#FBF6EE] transition-colors">
          Bureau
        </div>
        <div className="border-2 border-[#1A1A1A] rounded-full px-5 py-2.5 text-sm font-semibold cursor-pointer bg-white hover:bg-[#1A1A1A] hover:text-[#FBF6EE] transition-colors">
          Accessoires
        </div>
      </section>

      <TrustSection />

      {/* Catalogue coming soon */}
      <section className="max-w-7xl mx-auto px-10 py-20 text-center">
        <h2 className="font-serif font-semibold text-3xl mb-10">Le catalogue</h2>
        <p className="text-[#8A8579]">La page catalogue sera construite à l&apos;étape 5. Pour l&apos;instant, le setup est prêt ! 🚀</p>
      </section>

      <Footer />
    </main>
  )
}
