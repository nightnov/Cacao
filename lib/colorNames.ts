/**
 * Correspondance nom de couleur (FR) -> code hexadécimal, pour afficher une
 * vraie pastille de couleur à côté du nom de variante saisi par l'admin.
 *
 * Volontairement limitée aux noms courants et non ambigus. Un nom absent de
 * cette liste (ex. « Argent sidéral », « Édition limitée ») affiche un point
 * neutre plutôt qu'une couleur devinée au hasard.
 */
const COLOR_HEX: Record<string, string> = {
  noir: '#1A1A1A',
  blanc: '#F5F5F5',
  gris: '#8A8F98',
  'gris sidéral': '#5B5F66',
  'gris anthracite': '#3A3D42',
  argent: '#C7CBD1',
  rouge: '#D6362B',
  bordeaux: '#6D1F2A',
  bleu: '#2563EB',
  'bleu nuit': '#1E293B',
  'bleu ciel': '#7DD3FC',
  marine: '#1E2A4A',
  vert: '#16A34A',
  'vert olive': '#5A6B3B',
  jaune: '#FACC15',
  or: '#D4AF37',
  doré: '#D4AF37',
  orange: '#EA580C',
  violet: '#7C3AED',
  mauve: '#9B7FBF',
  rose: '#EC4899',
  'rose gold': '#E0A899',
  marron: '#78350F',
  beige: '#D9CBB2',
  turquoise: '#14B8A6',
  cuivre: '#B87333'
}

export function colorToHex(name: string): string | null {
  const key = name.trim().toLowerCase()
  return COLOR_HEX[key] || null
}
