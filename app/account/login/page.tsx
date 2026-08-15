'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function AccountLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('Email ou mot de passe incorrect')
        return
      }

      router.push('/account')
    } catch (err: any) {
      setError(err.message || 'Une erreur s\'est produite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-10 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-[#E4DDCF] p-8">
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-2">Connexion</h1>
            <p className="text-[#56534C] text-sm mb-8">Accédez à votre compte et vos commandes.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  placeholder="vous@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>

            <p className="text-xs text-[#8A8579] text-center mt-6">
              Pas encore de compte ?{' '}
              <Link href="/account/signup" className="text-[#FF6600] hover:underline font-semibold">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
