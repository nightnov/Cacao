import { getSupabaseClient } from '@/lib/supabase'

/**
 * Les 18 tokens de couleur du site. Cette liste fait autorité : toute clé
 * absente d'ici est ignorée, y compris si elle est présente en base.
 */
export const TOKEN_KEYS = [
  'bg',
  'bg-panel',
  'bg-sunken',
  'bg-raised',
  'ink',
  'ink-dim',
  'ink-dimmer',
  'ink-faint',
  'ink-invert',
  'border',
  'border-mid',
  'border-strong',
  'gold',
  'gold-dim',
  'green',
  'green-bright',
  'info',
  'danger',
] as const

export type TokenKey = (typeof TOKEN_KEYS)[number]
export type Tokens = Partial<Record<TokenKey, string>>

/** Libellés affichés dans l'administration, groupés par rôle. */
export const TOKEN_GROUPS: { title: string; hint: string; keys: TokenKey[] }[] = [
  {
    title: 'Fonds',
    hint: 'Du plus clair au plus foncé. « Fond » est la couleur dominante de la page.',
    keys: ['bg', 'bg-panel', 'bg-sunken', 'bg-raised'],
  },
  {
    title: 'Textes',
    hint: 'Doivent rester lisibles sur les fonds ci-dessus.',
    keys: ['ink', 'ink-dim', 'ink-dimmer', 'ink-faint', 'ink-invert'],
  },
  {
    title: 'Traits',
    hint: 'Bordures des cartes, séparateurs, contours de champs.',
    keys: ['border', 'border-mid', 'border-strong'],
  },
  {
    title: 'Accent et signaux',
    hint: "L'accent porte les boutons et les prix. Les signaux servent aux messages.",
    keys: ['gold', 'gold-dim', 'green', 'green-bright', 'info', 'danger'],
  },
]

export const TOKEN_LABELS: Record<TokenKey, string> = {
  bg: 'Fond',
  'bg-panel': 'Fond des cartes',
  'bg-sunken': 'Fond creusé',
  'bg-raised': 'Fond surélevé',
  ink: 'Texte principal',
  'ink-dim': 'Texte secondaire',
  'ink-dimmer': 'Texte discret',
  'ink-faint': 'Texte très discret',
  'ink-invert': 'Texte sur accent',
  border: 'Trait',
  'border-mid': 'Trait moyen',
  'border-strong': 'Trait marqué',
  gold: 'Accent',
  'gold-dim': 'Accent foncé',
  green: 'Succès',
  'green-bright': 'Succès clair',
  info: 'Information',
  danger: 'Erreur',
}

/**
 * Thème « Nuit ». Sert de secours si la base est injoignable et de base de
 * comparaison quand un thème enregistré ne définit qu'une partie des tokens.
 * Doit rester identique au bloc `:root` de app/globals.css.
 */
export const DEFAULT_TOKENS: Record<TokenKey, string> = {
  bg: '#1A1D1F',
  'bg-panel': '#24272B',
  'bg-sunken': '#151719',
  'bg-raised': '#2E3237',
  ink: '#EEF2F7',
  'ink-dim': '#B3B8BE',
  'ink-dimmer': '#8E959D',
  'ink-faint': '#6F767E',
  'ink-invert': '#1A1A1A',
  border: '#35383C',
  'border-mid': '#3E4247',
  'border-strong': '#4E5257',
  gold: '#FDC700',
  'gold-dim': '#E0B000',
  green: '#00A63E',
  'green-bright': '#3FCE7A',
  info: '#3CA4FF',
  danger: '#F87171',
}

const HEX = /^#[0-9A-Fa-f]{6}$/

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

/** « #FDC700 » → « 253 199 0 », la forme attendue par `rgb(var(--x) / …)`. */
export function hexToChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Luminance relative WCAG. */
function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Rapport de contraste entre deux couleurs, de 1:1 à 21:1. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Construit les variables de couleur à poser en attribut `style` sur <html>.
 *
 * Un attribut `style` plutôt qu'une balise <style> pour deux raisons : Next.js
 * gère lui-même le contenu de <head> et une balise ajoutée à la main y provoque
 * une erreur d'hydratation ; et surtout, aucun HTML brut n'est injecté, donc la
 * question de l'échappement ne se pose plus du tout.
 *
 * Les valeurs restent malgré tout filtrées : seules les clés de TOKEN_KEYS sont
 * lues, et seulement si leur valeur est un hexadécimal à six chiffres.
 *
 * Les couleurs identiques au thème « Nuit » sont omises — elles sont déjà dans
 * globals.css, les répéter n'alourdirait le HTML de chaque page pour rien.
 */
export function buildThemeStyle(tokens: Tokens): Record<string, string> {
  const style: Record<string, string> = {}
  for (const key of TOKEN_KEYS) {
    const value = tokens[key]
    if (!isValidHex(value)) continue
    if (value.toUpperCase() === DEFAULT_TOKENS[key].toUpperCase()) continue
    style[`--c-${key}`] = hexToChannels(value)
  }
  return style
}

/** Ne garde que les clés connues dont la valeur est un hexadécimal valide. */
export function sanitizeTokens(raw: unknown): Tokens {
  const out: Tokens = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of TOKEN_KEYS) {
    const value = (raw as Record<string, unknown>)[key]
    if (isValidHex(value)) out[key] = value.toUpperCase()
  }
  return out
}

export interface ResolvedTheme {
  slug: string
  name: string
  tokens: Tokens
  /** Vrai quand le thème s'applique parce qu'on est dans sa période programmée. */
  scheduled: boolean
}

/**
 * Détermine le thème à appliquer aujourd'hui.
 *
 * Un thème programmé dont la période couvre la date du jour l'emporte sur le
 * thème par défaut. En cas de chevauchement, celui dont la période a commencé
 * le plus récemment gagne — c'est le comportement attendu quand on superpose
 * une opération courte à une saison plus longue.
 *
 * Toute erreur ramène au thème « Nuit » : la boutique doit rester lisible même
 * si la base ne répond pas.
 */
export async function resolveTheme(): Promise<ResolvedTheme> {
  const fallback: ResolvedTheme = {
    slug: 'nuit',
    name: 'Nuit',
    tokens: {},
    scheduled: false,
  }

  try {
    const supabase = getSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    const [scheduledRes, settingRes] = await Promise.all([
      supabase
        .from('site_themes')
        .select('slug, name, tokens')
        .lte('starts_on', today)
        .gte('ends_on', today)
        .order('starts_on', { ascending: false })
        .limit(1),
      supabase.from('site_settings').select('value').eq('key', 'active_theme').maybeSingle(),
    ])

    const scheduled = scheduledRes.data?.[0]
    if (scheduled) {
      return {
        slug: scheduled.slug,
        name: scheduled.name,
        tokens: sanitizeTokens(scheduled.tokens),
        scheduled: true,
      }
    }

    const slug = settingRes.data?.value || 'nuit'
    const { data } = await supabase
      .from('site_themes')
      .select('slug, name, tokens')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return fallback
    return { slug: data.slug, name: data.name, tokens: sanitizeTokens(data.tokens), scheduled: false }
  } catch (err) {
    console.error('Thème : lecture impossible, retour au thème Nuit.', err)
    return fallback
  }
}
