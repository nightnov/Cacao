import type { MetadataRoute } from 'next'
import { fetchCatalog, fetchCategoryRows } from '@/lib/catalog.server'
import { siteUrl } from '@/lib/siteUrl'

/**
 * Plan du site remis aux moteurs de recherche.
 *
 * Un moteur ne devine pas qu'une boutique existe : il suit des liens depuis
 * des pages qu'il connaît déjà. Tant que personne ne pointe vers CACAO, aucun
 * lien ne mène ici, et le site reste introuvable autrement qu'en collant son
 * adresse. Ce fichier contourne l'impasse : il énumère lui même les pages, et
 * c'est ce qu'on dépose dans la Search Console de Google pour amorcer.
 *
 * Il est recalculé à chaque demande plutôt que figé au déploiement : un
 * produit ajouté aujourd'hui n'a pas à attendre le prochain envoi pour être
 * connu. Ce n'est pas un choix de performance mais une conséquence assumée :
 * `lib/catalog.server.ts` lit la base en refusant toute mise en mémoire, pour
 * les raisons expliquées là bas, et cela interdit de pré calculer le plan.
 * Un moteur passe ici quelques fois par jour ; le coût est nul.
 */
export const dynamic = 'force-dynamic'

/** Pages qui existent quoi qu'il arrive, indépendamment du catalogue. */
const PAGES_FIXES: { chemin: string; priorite: number }[] = [
  { chemin: '', priorite: 1 },
  { chemin: '/products', priorite: 0.9 },
  { chemin: '/livraison', priorite: 0.6 },
  { chemin: '/about', priorite: 0.5 },
  { chemin: '/contact', priorite: 0.5 },
  { chemin: '/faq', priorite: 0.5 },
  { chemin: '/legal/terms', priorite: 0.3 },
  { chemin: '/legal/privacy', priorite: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const maintenant = new Date()

  const entrees: MetadataRoute.Sitemap = PAGES_FIXES.map(p => ({
    url: `${base}${p.chemin}`,
    lastModified: maintenant,
    changeFrequency: 'weekly',
    priority: p.priorite,
  }))

  /**
   * Le catalogue n'est pas indispensable au plan.
   *
   * Si la base est momentanément injoignable, mieux vaut livrer un plan
   * réduit aux pages fixes qu'une erreur : un moteur qui reçoit une erreur
   * peut espacer ses prochaines visites pendant des jours.
   */
  try {
    const [produits, rayons] = await Promise.all([fetchCatalog(), fetchCategoryRows()])

    for (const rayon of rayons || []) {
      if (rayon.is_visible === false) continue
      entrees.push({
        url: `${base}/products?category=${encodeURIComponent(rayon.value)}`,
        lastModified: maintenant,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    for (const produit of produits) {
      entrees.push({
        url: `${base}/products/${produit.slug}`,
        lastModified: produit.created_at ? new Date(produit.created_at) : maintenant,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (erreur) {
    console.error('Plan du site : catalogue illisible, pages fixes seules.', erreur)
  }

  return entrees
}
