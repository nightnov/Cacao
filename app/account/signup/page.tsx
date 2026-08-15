'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function Signup() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName }
        }
      })

      if (signUpError) throw signUpError

      if (data.session) {
        router.push('/account')
      } else {
        setNeedsConfirmation(true)
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur s\'est produite')
    } finally {
      setLoading(false)
    }
  }

  if (needsConfirmation) {
    return (
      <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-10 py-16">
          <div className="w-full max-w-md bg-white rounded-lg border border-[#E4DDCF] p-8 text-center">
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-3">Vérifiez votre email</h1>
            <p className="text-[#56534C]">
              Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FBF6EE] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-10 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-[#E4DDCF] p-8">
            <h1 className="font-serif font-semibold text-2xl text-[#1A1A1A] mb-2">Créer un compte</h1>
            <p className="text-[#56534C] text-sm mb-8">Rejoignez Cacao pour suivre vos commandes.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
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
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  placeholder="6 caractères minimum"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </Button>
            </form>

            <p className="text-xs text-[#8A8579] text-center mt-6">
              Déjà un compte ?{' '}
              <Link href="/account/login" className="text-[#E85D25] hover:underline font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
