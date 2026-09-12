import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

/**
 * Ce que les moteurs de recherche ont le droit de parcourir.
 *
 * Sans ce fichier, un moteur explore tout ce qu'il trouve, y compris des pages
 * qui n'ont aucun sens dans un résultat de recherche : le panier d'un
 * visiteur, un tunnel de commande à moitié rempli, l'administration. Les y
 * laisser entrer ne les rend pas accessibles — l'administration reste protégée
 * par les règles de la base — mais cela dilue le site dans l'index et donne à
 * un visiteur la chance d'atterrir sur une page vide depuis Google.
 *
 * `/api/` est écarté pour la même raison : ce sont des réponses destinées au
 * code, pas des pages à lire.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/api/', '/account', '/account/', '/cart', '/checkout'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
