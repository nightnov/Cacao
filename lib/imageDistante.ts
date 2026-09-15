import { getSupabaseClient } from '@/lib/supabase'

/**
 * Rapatrie une image distante en fichier local.
 *
 * Le navigateur refuse de lire les pixels d'une image servie par un autre
 * domaine : sans ce détour par notre serveur, le recadrage d'une photo déjà en
 * place serait impossible. Il rend aussi la photo nôtre, au lieu d'un lien
 * chez un tiers qui casserait le jour où il la retire.
 *
 * Renvoie `null` plutôt que de lever : l'appelant a toujours une conduite de
 * repli, qui est de laisser l'image telle quelle.
 */
export async function rapatrierImage(url: string, seau = 'product-images'): Promise<File | null> {
  try {
    // Déjà chez nous : inutile de faire un détour par le serveur.
    if (url.includes(`/${seau}/`)) {
      const rep = await fetch(url)
      if (!rep.ok) return null
      const blob = await rep.blob()
      return new File([blob], 'photo', { type: blob.type })
    }

    const { data: { session } } = await getSupabaseClient().auth.getSession()
    if (!session) return null

    const rep = await fetch('/api/admin/telecharger-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url }),
    })
    if (!rep.ok) return null
    const blob = await rep.blob()
    return new File([blob], 'photo', { type: blob.type })
  } catch {
    return null
  }
}
