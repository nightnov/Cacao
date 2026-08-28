import 'server-only'
import { unstable_cache } from 'next/cache'
import { resolveTheme, type ResolvedTheme } from '@/lib/theme'

/** Étiquette de cache à invalider quand l'administration enregistre un thème. */
export const THEME_CACHE_TAG = 'site-theme'

/**
 * Le thème est lu à chaque affichage de page, mais il ne change que quelques
 * fois par an. Sans cache, chaque visite déclencherait deux requêtes Supabase
 * avant même d'afficher quoi que ce soit.
 *
 * `unstable_cache` évite aussi de rendre toutes les pages dynamiques : le site
 * peut rester en rendu statique, ce qui n'aurait pas été le cas avec un appel
 * Supabase nu dans le layout racine.
 *
 * Le délai d'une heure n'est qu'un filet : l'enregistrement d'un thème purge
 * l'étiquette et le changement est visible tout de suite. Ce délai sert au
 * basculement programmé, qui dépend de la date et n'a aucun événement pour le
 * déclencher — un habillage de Noël s'installe donc dans l'heure qui suit
 * minuit, pas à la seconde près.
 */
export const getTheme: () => Promise<ResolvedTheme> = unstable_cache(
  resolveTheme,
  ['site-theme'],
  { revalidate: 3600, tags: [THEME_CACHE_TAG] }
)
