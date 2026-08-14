export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBF6EE]">
      {/* Navbar */}
      <nav className="flex items-center gap-6 px-10 py-5 max-w-7xl mx-auto">
        <div className="flex flex-col gap-1 cursor-pointer flex-shrink-0">
          <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
          <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
          <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
        </div>
        <div className="font-serif font-bold text-3xl text-[#1A1A1A] flex-shrink-0">
          Cacao
        </div>
        <div className="flex-1 bg-[#FBF6EE] border-2 border-[#1A1A1A] rounded-full px-6 py-1.5 flex items-center gap-2 text-sm text-[#8A8579]">
          Que cherchez-vous ?
          <button className="bg-[#E85D25] w-10 h-10 rounded-full flex items-center justify-center text-white ml-auto flex-shrink-0">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="cursor-pointer">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-10 py-12">
        <span className="inline-block bg-[#E85D25] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5">
          NOUVEAU SUR LE MARCHÉ
        </span>
        <h1 className="font-serif font-semibold text-5xl leading-tight mb-4 max-w-2xl">
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

      {/* Trust section */}
      <section className="bg-white border-t border-b border-[#E4DDCF]">
        <div className="max-w-7xl mx-auto px-10 py-7 grid grid-cols-3 gap-6">
          <div className="text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1.8" className="mx-auto mb-2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <div className="font-semibold text-sm">Livraison via Yango</div>
            <small className="text-xs text-[#8A8579] underline decoration-dotted">Partout à Abidjan</small>
          </div>
          <div className="text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1.8" className="mx-auto mb-2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className="font-semibold text-sm">Garantie</div>
            <small className="text-xs text-[#8A8579] underline decoration-dotted">Sur chaque appareil</small>
          </div>
          <div className="text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1.8" className="mx-auto mb-2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <div className="font-semibold text-sm">Paiement sécurisé</div>
            <small className="text-xs text-[#8A8579] underline decoration-dotted">Via MoneyFusion</small>
          </div>
        </div>
      </section>

      {/* Catalogue coming soon */}
      <section className="max-w-7xl mx-auto px-10 py-20 text-center">
        <h2 className="font-serif font-semibold text-3xl mb-10">Le catalogue</h2>
        <p className="text-[#8A8579]">La page catalogue sera construite à l&apos;étape 5. Pour l&apos;instant, le setup est prêt ! 🚀</p>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E4DDCF] px-10 py-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="font-serif font-bold text-xl">Cacao</div>
          <div className="text-xs text-[#8A8579]">
            Abidjan, Côte d&apos;Ivoire · Paiement sécurisé MoneyFusion
          </div>
        </div>
      </footer>
    </main>
  )
}
