import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

export function useAdminAuth() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )

        const { data } = await supabase.auth.getSession()

        if (data.session?.user?.id === ADMIN_UUID) {
          setIsAdmin(true)
          setUser(data.session.user)
        } else {
          setIsAdmin(false)
          router.push('/admin/login')
        }
      } catch (error) {
        setIsAdmin(false)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  const logout = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    await supabase.auth.signOut()
    localStorage.removeItem('admin_session')
    router.push('/admin/login')
  }

  return { isAdmin, loading, user, logout }
}
