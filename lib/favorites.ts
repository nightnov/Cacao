import { getSupabaseClient } from '@/lib/supabase'

export const FAVORITES_EVENT = 'favorites-updated'

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Erreur lors du chargement des favoris:', error)
    return new Set()
  }

  return new Set((data || []).map(f => f.product_id))
}

export async function addFavorite(userId: string, productId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('favorites').insert([{ user_id: userId, product_id: productId }])
  if (error && error.code !== '23505') throw error // 23505 = déjà en favoris, ignoré
  window.dispatchEvent(new Event(FAVORITES_EVENT))
}

export async function removeFavorite(userId: string, productId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', productId)
  if (error) throw error
  window.dispatchEvent(new Event(FAVORITES_EVENT))
}

export async function toggleFavorite(userId: string, productId: string, isFavorite: boolean) {
  if (isFavorite) {
    await removeFavorite(userId, productId)
  } else {
    await addFavorite(userId, productId)
  }
}
