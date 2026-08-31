/**
 * Vocabulaire visuel partagé des pages publiques.
 *
 * Ces chaînes existent pour qu'un bouton du panier, un bouton du catalogue et
 * un bouton de la fiche produit soient le même objet. Jusqu'ici chaque page
 * réécrivait ses classes à la main : les rayons, les épaisseurs de trait et les
 * teintes de survol divergeaient d'un écran à l'autre.
 *
 * L'administration n'utilise volontairement pas ce fichier : elle a ses propres
 * composants, et le client ne la voit jamais.
 */

/** Rayon commun. Les cartes prennent `rounded-xl`, plus large, pour rester
 *  visuellement au-dessus des contrôles qu'elles contiennent. */
export const RADIUS = 'rounded-lg'

const BTN_BASE = [
  'inline-flex items-center justify-center gap-2 whitespace-nowrap',
  'font-semibold transition-colors duration-150',
  RADIUS,
  'active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  // Un bouton bloqué (rupture de stock, formulaire incomplet) doit se voir :
  // sans cet état, il est identique à un bouton actif et le clic semble cassé.
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100',
].join(' ')

export const BTN_SIZES = {
  sm: 'px-3.5 py-2 text-[12.5px]',
  md: 'px-5 py-2.5 text-[13px]',
  lg: 'px-6 py-3 text-[13.5px]',
} as const

export type BtnSize = keyof typeof BTN_SIZES

export const BTN_VARIANTS = {
  /**
   * Style par défaut, et de très loin le plus fréquent : fond transparent,
   * trait fin, texte clair. C'est lui qui donne la tenue sobre de l'ensemble.
   */
  sober:
    'bg-transparent border border-border-strong text-ink hover:bg-bg-raised hover:border-ink-faint disabled:hover:bg-transparent',
  /**
   * Action principale d'un écran — une seule à la fois. Clair sur sombre :
   * il ressort autant qu'un aplat de couleur sans consommer l'accent.
   */
  solid:
    'bg-ink border border-ink text-ink-invert hover:bg-ink-dim hover:border-ink-dim disabled:hover:bg-ink',
  /**
   * Réservé à ce qui doit vraiment alerter. Le doré est très clair : le texte
   * posé dessus doit rester `ink-invert`, du blanc tomberait à 1,6:1.
   */
  accent:
    'bg-gold border border-gold text-ink-invert hover:bg-gold-dim hover:border-gold-dim disabled:hover:bg-gold',
  /** Lien d'action sans cadre, pour les cas secondaires. */
  ghost:
    'bg-transparent border border-transparent text-ink-dim hover:text-ink hover:bg-bg-raised',

  // ── Variantes historiques ────────────────────────────────────────────────
  // Conservées à l'identique parce que l'administration s'en sert. Le client
  // ne voit jamais ces écrans, et la consigne est de ne pas y toucher : les
  // renommer aurait déplacé son apparence sans que ce soit demandé.
  // Les pages publiques, elles, utilisent les noms ci-dessus.
  primary:
    'bg-ink border border-ink text-ink-invert hover:bg-ink-dim hover:border-ink-dim disabled:hover:bg-ink',
  secondary:
    'bg-bg-raised border border-bg-raised text-ink hover:bg-bg-sunken disabled:hover:bg-bg-raised',
  outline:
    'border-2 border-border-strong text-ink hover:bg-bg-raised disabled:hover:bg-transparent',
} as const

export type BtnVariant = keyof typeof BTN_VARIANTS

export function btn(
  variant: BtnVariant = 'sober',
  size: BtnSize = 'md',
  extra = ''
): string {
  return `${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${extra}`.trim()
}

/**
 * Carte de contenu. Le fond est plus CLAIR que la page (voir globals.css) :
 * c'est ce palier, et non l'ombre, qui la fait avancer vers le lecteur.
 */
export const CARD = 'bg-bg-panel border border-border rounded-xl'
export const CARD_HOVER =
  'transition-colors duration-200 hover:border-border-strong'
