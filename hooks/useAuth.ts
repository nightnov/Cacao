import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return { user, loading, isLoggedIn: !!user, logout }
}
