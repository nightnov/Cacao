import { Laptop, Monitor, Gamepad2, Cpu, HardDrive, Headphones, Printer, LucideIcon } from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string
  icon: LucideIcon
}

export const CATEGORIES: CategoryDef[] = [
  { value: 'portable', label: 'PC Portables', icon: Laptop },
  { value: 'bureau', label: 'PC Bureau', icon: Monitor },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { value: 'ecrans', label: 'Écrans', icon: Monitor },
  { value: 'accessoire', label: 'Accessoires', icon: Headphones },
  { value: 'composants', label: 'Composants', icon: Cpu },
  { value: 'stockage', label: 'Stockage', icon: HardDrive },
  { value: 'imprimantes', label: 'Imprimantes', icon: Printer }
]

export const categoryLabel: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)
