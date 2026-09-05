import {
  BatteryMedium,
  Cpu,
  HardDrive,
  LayoutGrid,
  MemoryStick,
  Monitor,
  MonitorPlay,
  Usb,
  type LucideIcon,
} from 'lucide-react'

/**
 * Pictogramme de chaque pièce.
 *
 * La table est partagée entre la configuration de base, affichée à côté du
 * prix, et la section Description plus bas. Les deux parlent des mêmes pièces :
 * les laisser diverger donnerait un processeur représenté par deux dessins
 * différents sur la même page.
 *
 * Les clés sont celles de `products.specs` et de `component_glossary.icon`.
 */
export const SPEC_ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  ram: MemoryStick,
  storage: HardDrive,
  screen: Monitor,
  gpu: MonitorPlay,
  battery: BatteryMedium,
  os: LayoutGrid,
  ports: Usb,
}

export function specIcon(key: string): LucideIcon {
  return SPEC_ICONS[key] || Cpu
}
