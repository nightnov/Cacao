'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function Account() {
  const router = useRouter()
  const { user, loading, isLoggedIn, logout } = useAuth()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/account/login')
    }
  }, [loading, isLoggedIn, router])

  if (loading || !isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FBF6EE] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E85D25] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name

  return (
    <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto px-10 py-16 w-full">
        <h1 className="font-serif font-semibold text-4xl mb-8">Mon compte</h1>

        <div className="bg-white rounded-lg border border-[#E4DDCF] p-8">
          <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-4">
            {firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : 'Bienvenue'}
          </h2>
          <p className="text-[#56534C] mb-8">{user?.email}</p>

          <div className="bg-[#FBF6EE] rounded-lg p-4 border border-[#E4DDCF] mb-6">
            <p className="text-sm text-[#8A8579]">
              L&apos;historique de vos commandes sera bientôt disponible ici.
            </p>
          </div>

          <Button variant="outline" onClick={logout}>
            Déconnexion
          </Button>
        </div>
      </div>

      <Footer />
    </main>
  )
}
