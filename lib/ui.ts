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

/**
 * Largeur de contenu commune à toutes les sections publiques.
 *
 * 1280 px de large et 24 px de marge : ce sont les valeurs relevées sur le site
 * de référence, qui emploie le conteneur Tailwind avec `px-6`.
 *
 * Un cadrage plus large avait été essayé à 1440 px. Il donnait des cartes plus
 * grandes, mais pas le rendu recherché : l'impact ne vient pas de la largeur du
 * conteneur, il vient de la place que l'image prend DANS la carte.
 *
 * Les valeurs vivent ici plutôt que recopiées dans chaque section : elles
 * l'étaient à onze endroits, et une seule oubliée décalait toute une bande de
 * la page par rapport aux autres.
 */
export const CONTAINER = 'max-w-[1280px] mx-auto px-4 sm:px-6'

/* ── Échelle typographique ───────────────────────────────────────────────
 * Une hiérarchie explicite, plutôt qu'une taille choisie au cas par cas.
 * Tout grossir indistinctement aurait donné une page plus grosse, pas plus
 * lisible : c'est l'ÉCART entre les niveaux qui se lit.
 */

/**
 * Grand titre de section : 24 px sur téléphone, 36 px au-delà, graisse légère.
 *
 * Valeurs relevées sur le site de référence, qui emploie la même display.
 * À cette taille, le poids vient de la dimension : une graisse forte
 * alourdirait la page au lieu de l'affirmer.
 */
export const TITLE_SECTION =
  'font-display font-light text-[24px] sm:text-[36px] leading-[1.15] text-ink'

/** Titre de carte, produit comme gamme. */
export const TITLE_CARD = 'font-display font-medium text-[20px] leading-[1.25] text-ink'

const BTN_BASE = [
  'inline-flex items-center justify-center gap-2 whitespace-nowrap',
  'font-semibold transition-colors duration-150',
  RADIUS,
  'active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
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
   * Action principale d'un écran — une seule à la fois : ajouter au panier,
   * payer, valider. Elle porte la couleur commerciale, ce qui donne au parcours
   * d'achat un point d'appui visible sans colorer le reste de la page.
   */
  solid:
    'bg-action border border-action text-ink-invert hover:bg-accent-dim hover:border-accent-dim disabled:hover:bg-action',
  /**
   * Neutre plein. Pour une action forte qui n'est PAS commerciale — se
   * déconnecter, confirmer un choix — là où le bleu induirait en erreur.
   */
  neutral:
    'bg-ink border border-ink text-ink-invert hover:bg-ink-dim hover:border-ink-dim disabled:hover:bg-ink',
  /**
   * Promotion exceptionnelle uniquement. La couleur promotionnelle est très
   * claire : le texte posé dessus doit rester `ink-invert`, du blanc tomberait
   * sous 2:1.
   */
  promo:
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

/* ── Prix ────────────────────────────────────────────────────────────────
 * Le prix réel est le seul chiffre que le visiteur cherche : il porte la
 * couleur commerciale. Le prix barré reste gris et plus petit — le mettre en
 * couleur mettrait sur un pied d'égalité un montant qu'on ne paie pas.
 */
export const PRICE = 'font-display font-medium text-accent tabular-nums leading-tight'
export const PRICE_OLD = 'text-ink-faint line-through tabular-nums'

/**
 * Accent propre à chaque rayon.
 *
 * La table est explicite parce que Tailwind lit les classes dans le source :
 * une classe composée à l'exécution (`text-cat-${value}`) ne serait jamais
 * générée et la couleur n'existerait tout simplement pas.
 *
 * Un rayon inconnu — créé depuis l'administration — retombe sur la couleur
 * commerciale plutôt que sur du vide.
 */
export const CATEGORY_ACCENT: Record<
  string,
  { text: string; border: string; bg: string; ring: string }
> = {
  portable: {
    text: 'text-cat-portable',
    border: 'group-hover:border-cat-portable/50',
    bg: 'bg-cat-portable',
    ring: 'group-hover:shadow-[0_0_0_1px_rgb(var(--c-cat-portable)/0.25)]',
  },
  bureau: {
    text: 'text-cat-bureau',
    border: 'group-hover:border-cat-bureau/50',
    bg: 'bg-cat-bureau',
    ring: 'group-hover:shadow-[0_0_0_1px_rgb(var(--c-cat-bureau)/0.25)]',
  },
  gaming: {
    text: 'text-cat-gaming',
    border: 'group-hover:border-cat-gaming/50',
    bg: 'bg-cat-gaming',
    ring: 'group-hover:shadow-[0_0_0_1px_rgb(var(--c-cat-gaming)/0.25)]',
  },
  accessoire: {
    text: 'text-cat-accessoire',
    border: 'group-hover:border-cat-accessoire/50',
    bg: 'bg-cat-accessoire',
    ring: 'group-hover:shadow-[0_0_0_1px_rgb(var(--c-cat-accessoire)/0.25)]',
  },
}

const ACCENT_FALLBACK = {
  text: 'text-accent',
  border: 'group-hover:border-accent/50',
  bg: 'bg-accent',
  ring: 'group-hover:shadow-[0_0_0_1px_rgb(var(--c-accent)/0.25)]',
}

export function categoryAccent(value: string | null | undefined) {
  return (value && CATEGORY_ACCENT[value]) || ACCENT_FALLBACK
}

/**
 * Rangée qui défile latéralement sur téléphone, grille normale au delà.
 *
 * Empilées, quatre gammes ou trois modèles occupent plusieurs écrans de haut :
 * il faut faire défiler longtemps pour atteindre la section suivante, et rien
 * n'indique que d'autres familles existent. En rangée, on voit la première
 * carte entière et le bord de la seconde — ce débord est ce qui donne envie de
 * pousser du doigt.
 *
 * `-mx-4 px-4` fait toucher les cartes au bord de l'écran tout en gardant la
 * première alignée sur le texte. `snap-x` arrête le glissement sur une carte
 * plutôt qu'entre deux.
 */
export const SCROLL_ROW =
  'flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-2 ' +
  'sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0'

/** Largeur d'une carte dans cette rangée. Neutre dès que la grille reprend. */
export const SCROLL_CARD = 'w-[80vw] max-w-[310px] flex-shrink-0 snap-start sm:w-auto sm:max-w-none'
