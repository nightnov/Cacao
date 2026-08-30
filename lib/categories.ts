import {
  Laptop,
  Monitor,
  PcCase,
  Gamepad2,
  Cpu,
  HardDrive,
  Headphones,
  Printer,
  Package,
  Mouse,
  Keyboard,
  Smartphone,
  Camera,
  Speaker,
  Webcam,
  Router,
  Cable,
  Battery,
  LucideIcon,
} from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string
  /** Libellé court pour les barres de navigation denses */
  short: string
  icon: LucideIcon
  description?: string | null
  /** Accroche courte affichée sur la carte de gamme de l'accueil. */
  tagline?: string | null
  /** Photo de la carte de gamme. Vide = repli sur l'icône. */
  imageUrl?: string | null
  isVisible?: boolean
}

/**
 * Icônes proposées pour un rayon.
 *
 * La base ne stocke qu'un nom (« Laptop ») : elle ne peut pas contenir de
 * composant React. Cette table fait la traduction, et un nom absent retombe
 * sur `Package` — un rayon mal configuré affiche une icône neutre au lieu de
 * faire planter la page.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Laptop,
  PcCase,
  Gamepad2,
  Monitor,
  Headphones,
  Cpu,
  HardDrive,
  Printer,
  Package,
  Mouse,
  Keyboard,
  Smartphone,
  Camera,
  Speaker,
  Webcam,
  Router,
  Cable,
  Battery,
}

/** Noms d'icônes proposés dans l'administration, avec leur libellé français. */
export const CATEGORY_ICON_CHOICES: { name: string; label: string }[] = [
  { name: 'Laptop', label: 'Ordinateur portable' },
  { name: 'PcCase', label: 'Unité centrale' },
  { name: 'Gamepad2', label: 'Manette de jeu' },
  { name: 'Monitor', label: 'Écran' },
  { name: 'Headphones', label: 'Casque audio' },
  { name: 'Cpu', label: 'Processeur' },
  { name: 'HardDrive', label: 'Disque dur' },
  { name: 'Printer', label: 'Imprimante' },
  { name: 'Mouse', label: 'Souris' },
  { name: 'Keyboard', label: 'Clavier' },
  { name: 'Smartphone', label: 'Téléphone' },
  { name: 'Camera', label: 'Appareil photo' },
  { name: 'Speaker', label: 'Enceinte' },
  { name: 'Webcam', label: 'Webcam' },
  { name: 'Router', label: 'Box / routeur' },
  { name: 'Cable', label: 'Câble' },
  { name: 'Battery', label: 'Batterie' },
  { name: 'Package', label: 'Générique' },
]

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Package
}

/**
 * Rayons de secours.
 *
 * Ils reprennent exactement le contenu de la migration 021. Ils servent le
 * temps que la page charge la vraie liste, et si la base est injoignable — un
 * menu figé vaut mieux qu'une navigation vide.
 */
export const FALLBACK_CATEGORIES: CategoryDef[] = [
  { value: 'portable', label: 'PC Portables', short: 'Portables', icon: Laptop },
  { value: 'bureau', label: 'PC Bureau', short: 'Bureau', icon: PcCase },
  { value: 'gaming', label: 'Gaming', short: 'Gaming', icon: Gamepad2 },
  { value: 'ecrans', label: 'Écrans', short: 'Écrans', icon: Monitor },
  { value: 'accessoire', label: 'Accessoires', short: 'Accessoires', icon: Headphones },
  { value: 'composants', label: 'Composants', short: 'Composants', icon: Cpu },
  { value: 'stockage', label: 'Stockage', short: 'Stockage', icon: HardDrive },
  { value: 'imprimantes', label: 'Imprimantes', short: 'Imprimantes', icon: Printer },
]

/**
 * Conservé sous son ancien nom : plusieurs écrans l'importent encore pour
 * afficher le nom d'un rayon à partir de sa clé. Ne connaît que les rayons
 * d'origine ; `labelFor` ci-dessous gère aussi ceux créés depuis
 * l'administration.
 */
export const CATEGORIES = FALLBACK_CATEGORIES

export const categoryLabel: Record<string, string> = Object.fromEntries(
  FALLBACK_CATEGORIES.map(c => [c.value, c.label])
)

/** Nom affichable d'un rayon, y compris pour un rayon créé après coup. */
export function labelFor(value: string, list?: CategoryDef[]): string {
  const found = (list || FALLBACK_CATEGORIES).find(c => c.value === value)
  return found?.label || categoryLabel[value] || value
}
