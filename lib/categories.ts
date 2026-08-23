import { Laptop, Monitor, PcCase, Gamepad2, Cpu, HardDrive, Headphones, Printer, LucideIcon } from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string
  /** Libellé court pour les barres de navigation denses */
  short: string
  icon: LucideIcon
}

/**
 * Source unique des catégories (admin, catalogue, fiche produit, navbar, footer).
 *
 * Chaque catégorie a une icône distincte : « PC Bureau » et « Écrans »
 * partageaient l'icône `Monitor`, ce qui les rendait impossibles à
 * différencier dans la barre de catégories.
 */
export const CATEGORIES: CategoryDef[] = [
  { value: 'portable', label: 'PC Portables', short: 'Portables', icon: Laptop },
  { value: 'bureau', label: 'PC Bureau', short: 'Bureau', icon: PcCase },
  { value: 'gaming', label: 'Gaming', short: 'Gaming', icon: Gamepad2 },
  { value: 'ecrans', label: 'Écrans', short: 'Écrans', icon: Monitor },
  { value: 'accessoire', label: 'Accessoires', short: 'Accessoires', icon: Headphones },
  { value: 'composants', label: 'Composants', short: 'Composants', icon: Cpu },
  { value: 'stockage', label: 'Stockage', short: 'Stockage', icon: HardDrive },
  { value: 'imprimantes', label: 'Imprimantes', short: 'Imprimantes', icon: Printer }
]

export const categoryLabel: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)
