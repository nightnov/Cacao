import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export interface ShopInfo {
  email: string
  phone: string
  whatsapp: string
  address: string
}

export const SHOP_INFO_KEYS = ['shop_email', 'shop_phone', 'shop_whatsapp', 'shop_address'] as const

/**
 * Coordonnées de la boutique.
 *
 * Les valeurs de repli sont volontairement vides plutôt que fictives : la page
 * contact affichait « +225 07 XX XX XX XX », un texte de remplacement resté en
 * ligne. Mieux vaut ne rien montrer qu'un numéro que personne ne peut appeler.
 */
const EMPTY: ShopInfo = { email: '', phone: '', whatsapp: '', address: '' }

let cache: ShopInfo | null = null
let inFlight: Promise<ShopInfo> | null = null

async function fetchShopInfo(): Promise<ShopInfo> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', SHOP_INFO_KEYS as unknown as string[])

    if (error) return EMPTY
    const map = Object.fromEntries((data || []).map(r => [r.key, r.value || '']))
    return {
      email: map.shop_email || '',
      phone: map.shop_phone || '',
      whatsapp: map.shop_whatsapp || '',
      address: map.shop_address || '',
    }
  } catch {
    return EMPTY
  }
}

export function invalidateShopInfoCache() {
  cache = null
  inFlight = null
}

export function useShopInfo(): ShopInfo {
  const [info, setInfo] = useState<ShopInfo>(cache || EMPTY)

  useEffect(() => {
    let alive = true
    if (cache) {
      setInfo(cache)
      return
    }
    if (!inFlight) inFlight = fetchShopInfo()
    inFlight.then(v => {
      cache = v
      inFlight = null
      if (alive) setInfo(v)
    })
    return () => {
      alive = false
    }
  }, [])

  return info
}
