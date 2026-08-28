'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase'
import { toggleFavorite, FAVORITES_EVENT } from '@/lib/favorites'

interface FavoriteButtonProps {
  productId: string
  size?: number
  className?: string
}

export function FavoriteButton({ productId, size = 18, className = '' }: FavoriteButtonProps) {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setIsFavorite(false)
      return
    }

    const checkFavorite = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()
      setIsFavorite(!!data)
    }

    checkFavorite()
    window.addEventListener(FAVORITES_EVENT, checkFavorite)
    return () => window.removeEventListener(FAVORITES_EVENT, checkFavorite)
  }, [isLoggedIn, user, productId])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn || !user) {
      router.push('/account/login')
      return
    }

    setLoading(true)
    try {
      await toggleFavorite(user.id, productId, isFavorite)
      setIsFavorite(!isFavorite)
    } catch (err) {
      console.error('Erreur favoris:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`inline-flex items-center justify-center rounded-full bg-bg-panel/90 backdrop-blur-sm hover:bg-bg-panel transition-colors disabled:opacity-50 ${className}`}
    >
      <Heart
        size={size}
        className={isFavorite ? 'fill-gold text-gold' : 'text-ink'}
        strokeWidth={1.8}
      />
    </button>
  )
}
