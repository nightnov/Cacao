'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import Link from 'next/link'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

export default function AdminLogin() {
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError('Email ou mot de passe incorrect')
        setLoading(false)
        return
      }

      if (data.user?.id !== ADMIN_UUID) {
        await supabase.auth.signOut()
        setError('Accès refusé. Vous n\'êtes pas administrateur.')
        setLoading(false)
        return
      }

      // Stockage du token dans localStorage pour la vérification ultérieure
      localStorage.setItem('admin_session', JSON.stringify({
        user_id: data.user.id,
        email: data.user.email,
        timestamp: new Date().getTime()
      }))

      router.push('/admin')
    } catch (err) {
      setError('Une erreur s\'est produite')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="font-serif font-bold text-3xl text-[#241A14] hover:opacity-80 block text-center mb-12">
          Cacao Admin
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-[#E8E0D8] p-8">
          <h1 className="font-serif font-semibold text-2xl text-[#241A14] mb-2">Connexion</h1>
          <p className="text-[#5B4B41] text-sm mb-8">Accès administrateur réservé</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                placeholder="admin@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Help Text */}
          <p className="text-xs text-[#7D6A5D] text-center mt-6">
            Vous n&apos;êtes pas administrateur ?{' '}
            <Link href="/" className="text-[#C2410C] hover:underline font-semibold">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
