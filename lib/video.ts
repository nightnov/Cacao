/** Identifiant YouTube, pour construire l'adresse d'une vignette. */
export function getYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v')
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1) || null
    return null
  } catch {
    return null
  }
}

/**
 * Vignette de la vidéo, servie par YouTube.
 *
 * `hqdefault` plutôt que `maxresdefault` : cette dernière n'existe pas pour
 * toutes les vidéos et renvoie alors une image cassée, là où `hqdefault` est
 * toujours générée.
 */
export function getVideoThumbnail(url: string): string | null {
  const id = getYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/**
 * Adresse d'intégration du lecteur.
 *
 * Lecture automatique en mode muet uniquement : les navigateurs bloquent le
 * démarrage automatique d'une vidéo avec le son, et la vidéo resterait figée
 * sur sa première image sans que rien ne l'explique. `mute=1` est donc la
 * condition pour que `autoplay=1` ait un effet. `playsinline=1` évite le
 * passage en plein écran forcé sur iPhone.
 */
export function getVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const params = 'autoplay=1&mute=1&playsinline=1&rel=0'

    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}?${params}` : null
    }

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}?${params}` : null
    }

    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1&muted=1` : null
    }

    return null
  } catch {
    return null
  }
}
