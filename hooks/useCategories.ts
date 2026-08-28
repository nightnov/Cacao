import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { FALLBACK_CATEGORIES, categoryIcon, type CategoryDef } from '@/lib/categories'

/**
 * Les rayons vivent en base (migration 021) pour être modifiables depuis
 * l'administration.
 *
 * Le résultat est mémorisé au niveau du module : la navbar, le pied de page et
 * le catalogue sont affichés ensemble sur chaque page et demanderaient sinon
 * trois fois la même liste. La liste ne change que quand l'administrateur la
 * modifie, donc un cache pour la durée de la visite est largement suffisant.
 */
let cache: CategoryDef[] | null = null
let inFlight: Promise<CategoryDef[]> | null = null

async function fetchCategories(): Promise<CategoryDef[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('categories')
      .select('value, label, short_label, icon, description, is_visible')
      .order('sort_order')

    // Tant que la migration n'est pas exécutée, la table n'existe pas : on
    // garde la liste figée plutôt que d'afficher une navigation vide.
    if (error || !data?.length) return FALLBACK_CATEGORIES

    return data.map(row => ({
      value: row.value,
      label: row.label,
      short: row.short_label || row.label,
      icon: categoryIcon(row.icon),
      description: row.description,
      isVisible: row.is_visible,
    }))
  } catch {
    return FALLBACK_CATEGORIES
  }
}

export function invalidateCategoriesCache() {
  cache = null
  inFlight = null
}

/**
 * @param visibleOnly Ne renvoyer que les rayons affichables. L'administration
 *   a besoin de la liste complète ; la boutique, non.
 */
export function useCategories(visibleOnly = true): CategoryDef[] {
  const [categories, setCategories] = useState<CategoryDef[]>(cache || FALLBACK_CATEGORIES)

  useEffect(() => {
    let alive = true

    if (cache) {
      setCategories(cache)
      return
    }

    // Une seule requête même si plusieurs composants montent en même temps.
    if (!inFlight) inFlight = fetchCategories()

    inFlight.then(list => {
      cache = list
      inFlight = null
      if (alive) setCategories(list)
    })

    return () => {
      alive = false
    }
  }, [])

  return visibleOnly ? categories.filter(c => c.isVisible !== false) : categories
}
