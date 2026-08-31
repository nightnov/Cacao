/**
 * Zone d'accueil : diapositives promotionnelles et réglages d'affichage.
 *
 * Le texte d'accroche et le carrousel s'activent séparément. Couper l'un donne
 * toute la largeur à l'autre ; couper les deux fait disparaître la zone. C'est
 * ce qui permet de passer d'une accroche rédigée à une grande bannière de
 * communication sans toucher au code.
 */

export interface PromoSlide {
  id: string
  image_url: string
  link_url: string | null
  alt_text: string | null
  sort_order: number
  is_active: boolean
}

export interface HeroSettings {
  textEnabled: boolean
  carouselEnabled: boolean
  /** Durée d'affichage d'une image avant de passer à la suivante. */
  intervalMs: number
}

export const HERO_SETTING_KEYS = [
  'hero_text_enabled',
  'hero_carousel_enabled',
  'hero_carousel_interval_ms',
] as const

/** Bornes de la durée entre deux images, en millisecondes. */
export const MIN_INTERVAL_MS = 2000
export const MAX_INTERVAL_MS = 30000

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  textEnabled: true,
  carouselEnabled: true,
  intervalMs: 6000,
}

/**
 * Traduit les lignes brutes de `site_settings` en réglages exploitables.
 *
 * Une clé absente vaut son défaut plutôt que `false` : tant que la migration
 * n'a pas été exécutée, l'accueil doit continuer d'afficher son texte, pas
 * disparaître.
 */
export function parseHeroSettings(
  rows: { key: string; value: string | null }[] | null | undefined
): HeroSettings {
  const map = new Map((rows || []).map(r => [r.key, r.value]))

  const bool = (key: string, fallback: boolean) => {
    const raw = map.get(key)
    if (raw === undefined || raw === null || raw === '') return fallback
    return raw === 'true'
  }

  const rawInterval = Number(map.get('hero_carousel_interval_ms'))
  const intervalMs = Number.isFinite(rawInterval) && rawInterval > 0
    ? Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, rawInterval))
    : DEFAULT_HERO_SETTINGS.intervalMs

  return {
    textEnabled: bool('hero_text_enabled', DEFAULT_HERO_SETTINGS.textEnabled),
    carouselEnabled: bool('hero_carousel_enabled', DEFAULT_HERO_SETTINGS.carouselEnabled),
    intervalMs,
  }
}
