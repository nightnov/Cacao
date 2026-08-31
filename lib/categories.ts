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
 * Rayons de secours, affichés le temps que la vraie liste arrive de la base et
 * si celle-ci est injoignable — un menu figé vaut mieux qu'une navigation vide.
 *
 * Cette liste doit refléter les rayons RÉELLEMENT visibles. Elle contenait
 * encore « Écrans », « Stockage » et « Imprimantes » alors que la base ne les
 * publie plus : pendant le bref instant du chargement, et sur toute page dont
 * la lecture échouait, le menu du catalogue affichait donc des rayons que
 * l'accueil, lui, n'affichait pas. C'est l'incohérence constatée entre les
 * pages — le code portait une deuxième source de vérité.
 */
export const FALLBACK_CATEGORIES: CategoryDef[] = [
  { value: 'portable', label: 'PC Portables', short: 'Portables', icon: Laptop },
  { value: 'bureau', label: 'PC Bureau', short: 'Bureau', icon: PcCase },
  { value: 'gaming', label: 'Gaming', short: 'Gaming', icon: Gamepad2 },
  { value: 'accessoire', label: 'Accessoires', short: 'Accessoires', icon: Headphones },
  { value: 'composants', label: 'Composants', short: 'Composants', icon: Cpu },
]

/**
 * Conservé sous son ancien nom : plusieurs écrans l'importent encore pour
 * afficher le nom d'un rayon à partir de sa clé.
 */
export const CATEGORIES = FALLBACK_CATEGORIES

/**
 * Noms d'affichage, y compris pour les rayons retirés de la navigation.
 *
 * Volontairement plus large que `FALLBACK_CATEGORIES` : un produit rangé
 * autrefois dans « Stockage » doit continuer d'afficher « Stockage » sur sa
 * fiche et dans le fil d'Ariane. Sans ces entrées, il afficherait la clé brute
 * « stockage ». Masquer un rayon le retire des menus, pas du vocabulaire.
 */
export const categoryLabel: Record<string, string> = {
  ...Object.fromEntries(FALLBACK_CATEGORIES.map(c => [c.value, c.label])),
  ecrans: 'Écrans',
  stockage: 'Stockage',
  imprimantes: 'Imprimantes',
}

/** Nom affichable d'un rayon, y compris pour un rayon créé après coup. */
export function labelFor(value: string, list?: CategoryDef[]): string {
  const found = (list || FALLBACK_CATEGORIES).find(c => c.value === value)
  return found?.label || categoryLabel[value] || value
}
