/**
 * Adresse publique du site, en un seul endroit.
 *
 * Trois choses en dépendent et doivent toujours s'accorder : le plan du site
 * donné aux moteurs de recherche, le fichier robots, et les adresses absolues
 * des aperçus de partage. Si elles divergent, un moteur déclare le site en
 * double avec lui même et n'en retient qu'une version.
 *
 * L'ordre de lecture suit la certitude décroissante :
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — le nom de domaine définitif, quand il existe.
 *      C'est la seule valeur que vous ayez à poser le jour où vous achetez un
 *      domaine ; rien d'autre dans le code n'est à toucher.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — l'adresse de production que Vercel
 *      fournit seul. Elle reste stable d'un déploiement à l'autre, contrairement
 *      à `VERCEL_URL` qui change à chaque envoi et ne doit jamais servir ici.
 *   3. L'adresse actuelle, écrite en clair, pour que rien ne casse en local.
 */
const REPLI = 'https://cacao-ivory.vercel.app'

export function siteUrl(): string {
  const explicite = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicite) return sansBarreFinale(normaliser(explicite))

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return sansBarreFinale(normaliser(vercel))

  return REPLI
}

/** Le protocole est souvent oublié dans une variable d'environnement. */
function normaliser(valeur: string): string {
  return /^https?:\/\//i.test(valeur) ? valeur : `https://${valeur}`
}

/** Une barre finale produirait `https://site.ci//products` à la concaténation. */
function sansBarreFinale(valeur: string): string {
  return valeur.replace(/\/+$/, '')
}
