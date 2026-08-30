import {
  Cpu,
  MemoryStick,
  HardDrive,
  CircuitBoard,
  Fan,
  Power,
  PcCase,
  Snowflake,
  Monitor,
  Keyboard,
  Wifi,
  Settings,
  Thermometer,
  Package,
  Battery,
  Disc,
  Server,
  type LucideIcon,
} from 'lucide-react'

/**
 * Composants affichés sur la fiche produit.
 *
 * Chaque ligne porte un type — qui choisit l'icône — et un texte libre. Le
 * texte reste libre à dessein : les références changent à chaque
 * réapprovisionnement, et les enfermer dans des listes fermées obligerait à
 * modifier le code à chaque nouveau modèle.
 */
export interface ProductComponent {
  type: string
  label: string
}

/**
 * Types proposés, avec leur icône.
 *
 * `Gpu` n'existe pas dans la version de lucide utilisée ici : la carte
 * graphique emprunte donc `CircuitBoard`. Les noms sont vérifiés avant d'être
 * ajoutés — un import inexistant fait échouer la compilation entière.
 */
export const COMPONENT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'gpu', label: 'Carte graphique', icon: CircuitBoard },
  { value: 'cpu', label: 'Processeur', icon: Cpu },
  { value: 'ram', label: 'Mémoire vive', icon: MemoryStick },
  { value: 'storage', label: 'Stockage', icon: HardDrive },
  { value: 'motherboard', label: 'Carte mère', icon: Server },
  { value: 'cooling', label: 'Refroidissement', icon: Snowflake },
  { value: 'psu', label: 'Alimentation', icon: Power },
  { value: 'case', label: 'Boîtier', icon: PcCase },
  { value: 'fans', label: 'Ventilateurs', icon: Fan },
  { value: 'thermal', label: 'Pâte thermique', icon: Thermometer },
  { value: 'os', label: 'Système', icon: Settings },
  { value: 'screen', label: 'Écran', icon: Monitor },
  { value: 'keyboard', label: 'Clavier', icon: Keyboard },
  { value: 'network', label: 'Réseau', icon: Wifi },
  { value: 'battery', label: 'Batterie', icon: Battery },
  { value: 'optical', label: 'Lecteur optique', icon: Disc },
  { value: 'other', label: 'Autre', icon: Package },
]

const BY_VALUE = new Map(COMPONENT_TYPES.map(t => [t.value, t]))

/** Icône d'un type. Un type inconnu reçoit une icône neutre plutôt que rien. */
export function componentIcon(type: string | null | undefined): LucideIcon {
  return (type && BY_VALUE.get(type)?.icon) || Package
}

export function componentTypeLabel(type: string | null | undefined): string {
  return (type && BY_VALUE.get(type)?.label) || 'Composant'
}

/**
 * Ne garde que les lignes exploitables.
 *
 * Une ligne sans texte n'a rien à afficher, et une valeur qui n'est pas un
 * objet viendrait d'une saisie corrompue : mieux vaut l'ignorer que rendre une
 * case vide dans la grille.
 */
export function sanitizeComponents(raw: unknown): ProductComponent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map(c => ({
      type: typeof c.type === 'string' ? c.type : 'other',
      label: typeof c.label === 'string' ? c.label.trim() : '',
    }))
    .filter(c => c.label.length > 0)
}
