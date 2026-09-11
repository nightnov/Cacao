/**
 * Mise au carré des photos de produit, au moment de l'envoi.
 *
 * Les photos viennent de vendeurs différents et n'ont aucune règle commune :
 * l'une est détourée au ras de la machine, l'autre flotte au milieu d'une
 * grande marge vide, une troisième est en paysage large. Affichées côte à
 * côte, la première paraît énorme et la deuxième minuscule, alors que les deux
 * occupent la même case.
 *
 * Aucune règle d'affichage ne corrige ça : `object-contain` respecte les
 * proportions du fichier, marge comprise. La marge fait partie de l'image, il
 * faut donc la retirer du fichier.
 *
 * Le traitement : détecter la couleur de fond aux quatre coins, rogner la
 * bordure uniforme, puis recomposer sur un carré où le produit occupe toujours
 * la même part. Deux photos traitées ainsi se ressemblent, quelle que soit leur
 * origine.
 *
 * Ce module ne s'exécute que dans le navigateur : il utilise un canevas.
 */

/** Côté du carré produit. Au delà, le fichier grossit sans gain visible. */
const COTE = 1200

/** Part du carré occupée par le produit. Le reste est une marge d'air égale. */
const REMPLISSAGE = 0.88

/** Écart toléré par canal pour considérer deux pixels de même couleur. */
const TOLERANCE = 14

/** Taille de travail maximale, pour ne pas analyser 20 millions de pixels. */
const ANALYSE_MAX = 1600

interface Fond {
  r: number
  g: number
  b: number
  a: number
  /** Faux si les quatre coins diffèrent : l'image a un vrai décor. */
  uniforme: boolean
}

function lireFond(data: Uint8ClampedArray, largeur: number, hauteur: number): Fond {
  const coin = (x: number, y: number) => {
    const i = (y * largeur + x) * 4
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }
  }
  const coins = [
    coin(0, 0),
    coin(largeur - 1, 0),
    coin(0, hauteur - 1),
    coin(largeur - 1, hauteur - 1),
  ]

  const ref = coins[0]
  // Un coin transparent suffit : l'image est déjà détourée, et comparer ses
  // canaux de couleur n'aurait aucun sens puisqu'ils sont invisibles.
  const tousTransparents = coins.every(c => c.a < 16)
  const uniforme =
    tousTransparents ||
    coins.every(
      c =>
        Math.abs(c.r - ref.r) <= TOLERANCE &&
        Math.abs(c.g - ref.g) <= TOLERANCE &&
        Math.abs(c.b - ref.b) <= TOLERANCE &&
        Math.abs(c.a - ref.a) <= TOLERANCE
    )

  return { ...ref, uniforme }
}

function estFond(data: Uint8ClampedArray, i: number, fond: Fond): boolean {
  // Deux pixels transparents sont du fond, quelles que soient leurs couleurs.
  if (fond.a < 16) return data[i + 3] < 16
  return (
    Math.abs(data[i] - fond.r) <= TOLERANCE &&
    Math.abs(data[i + 1] - fond.g) <= TOLERANCE &&
    Math.abs(data[i + 2] - fond.b) <= TOLERANCE &&
    Math.abs(data[i + 3] - fond.a) <= TOLERANCE
  )
}

/** Rectangle contenant tout ce qui n'est pas du fond. */
function contenu(
  data: Uint8ClampedArray,
  largeur: number,
  hauteur: number,
  fond: Fond
): { x: number; y: number; w: number; h: number } | null {
  let haut = 0
  let bas = hauteur - 1
  let gauche = 0
  let droite = largeur - 1

  const ligneVide = (y: number) => {
    for (let x = 0; x < largeur; x++) {
      if (!estFond(data, (y * largeur + x) * 4, fond)) return false
    }
    return true
  }
  const colonneVide = (x: number) => {
    for (let y = haut; y <= bas; y++) {
      if (!estFond(data, (y * largeur + x) * 4, fond)) return false
    }
    return true
  }

  while (haut < bas && ligneVide(haut)) haut++
  while (bas > haut && ligneVide(bas)) bas--
  while (gauche < droite && colonneVide(gauche)) gauche++
  while (droite > gauche && colonneVide(droite)) droite--

  const w = droite - gauche + 1
  const h = bas - haut + 1
  if (w < 8 || h < 8) return null
  return { x: gauche, y: haut, w, h }
}

/** Ce que l'analyse a compris d'une photo, avant toute recomposition. */
export interface AnalyseImage {
  source: ImageBitmap
  /** Zone utile de la photo d'origine, marge uniforme retirée. */
  src: { x: number; y: number; w: number; h: number }
  fond: Fond
  nom: string
  /** Vrai si une bordure uniforme a effectivement été trouvée et retirée. */
  rognee: boolean
}

/** Réglage de cadrage. Neutre par défaut : le calcul automatique s'applique. */
export interface Reglage {
  /** Multiplie la taille du produit dans le carré. 1 = réglage automatique. */
  zoom: number
  /** Décalage horizontal, en part du côté. 0 = centré. */
  dx: number
  /** Décalage vertical, en part du côté. 0 = centré. */
  dy: number
}

export const REGLAGE_NEUTRE: Reglage = { zoom: 1, dx: 0, dy: 0 }

/**
 * Analyse une photo sans la modifier.
 *
 * Renvoie `null` quand rien ne peut être fait de sûr — format vectoriel,
 * fichier illisible, canevas indisponible. L'appelant envoie alors la photo
 * telle quelle : une image qu'on n'a pas su lire doit rester celle que vous
 * avez fournie, pas un carré fabriqué à partir d'une lecture ratée.
 */
export async function analyserImage(fichier: File): Promise<AnalyseImage | null> {
  if (typeof document === 'undefined') return null
  // Les images vectorielles n'ont pas de pixels à analyser et se redimensionnent
  // déjà proprement : les passer au canevas ne ferait que les dégrader.
  if (fichier.type === 'image/svg+xml') return null

  let source: ImageBitmap
  try {
    source = await createImageBitmap(fichier)
  } catch {
    return null
  }

  try {
    // Analyse sur une copie réduite : le rectangle trouvé est ensuite ramené
    // aux proportions de l'original, ce qui évite de parcourir des millions de
    // pixels sans rien gagner en précision.
    const echelle = Math.min(1, ANALYSE_MAX / Math.max(source.width, source.height))
    const aw = Math.max(1, Math.round(source.width * echelle))
    const ah = Math.max(1, Math.round(source.height * echelle))

    const analyse = document.createElement('canvas')
    analyse.width = aw
    analyse.height = ah
    const ctxA = analyse.getContext('2d', { willReadFrequently: true })
    if (!ctxA) {
      source.close()
      return null
    }
    ctxA.drawImage(source, 0, 0, aw, ah)
    const { data } = ctxA.getImageData(0, 0, aw, ah)

    const fond = lireFond(data, aw, ah)
    // Sans bordure uniforme, l'image a un vrai décor photographique. On ne
    // rogne rien : le bord n'est pas une marge, c'est le sujet.
    const boite = fond.uniforme ? contenu(data, aw, ah, fond) : null

    return {
      source,
      fond,
      nom: fichier.name,
      rognee: !!boite,
      src: boite
        ? { x: boite.x / echelle, y: boite.y / echelle, w: boite.w / echelle, h: boite.h / echelle }
        : { x: 0, y: 0, w: source.width, h: source.height },
    }
  } catch {
    source.close()
    return null
  }
}

/**
 * Dessine le carré final sur un canevas donné.
 *
 * L'aperçu du calibrage et le fichier envoyé passent tous les deux par ici :
 * un aperçu calculé autrement mentirait sur le résultat, et c'est exactement
 * ce qu'on vous demande de juger à l'écran.
 */
export function dessinerCarre(
  canevas: HTMLCanvasElement,
  analyse: AnalyseImage,
  reglage: Reglage
): void {
  const cote = canevas.width
  const ctx = canevas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, cote, cote)

  // Le fond n'est repeint que s'il était opaque. Sur une image détourée on
  // laisse la transparence : inventer un blanc collerait un rectangle clair
  // au milieu du panneau sombre de la fiche.
  if (analyse.fond.uniforme && analyse.fond.a >= 16) {
    ctx.fillStyle = `rgb(${analyse.fond.r} ${analyse.fond.g} ${analyse.fond.b})`
    ctx.fillRect(0, 0, cote, cote)
  }

  ctx.imageSmoothingQuality = 'high'
  const { src } = analyse
  const facteur = (cote * REMPLISSAGE * reglage.zoom) / Math.max(src.w, src.h)
  const w = src.w * facteur
  const h = src.h * facteur
  ctx.drawImage(
    analyse.source,
    src.x,
    src.y,
    src.w,
    src.h,
    (cote - w) / 2 + reglage.dx * cote,
    (cote - h) / 2 + reglage.dy * cote,
    w,
    h
  )
}

/** Fabrique le fichier carré définitif à partir d'une analyse et d'un réglage. */
export async function composerCarre(
  analyse: AnalyseImage,
  reglage: Reglage = REGLAGE_NEUTRE
): Promise<File | null> {
  const sortie = document.createElement('canvas')
  sortie.width = COTE
  sortie.height = COTE
  dessinerCarre(sortie, analyse, reglage)

  const blob = await new Promise<Blob | null>(resolve =>
    sortie.toBlob(resolve, 'image/webp', 0.92)
  )
  if (!blob) return null

  const nom = analyse.nom.replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], nom, { type: 'image/webp' })
}

/**
 * Version carrée du fichier, cadrage automatique, sans intervention.
 *
 * Le repli sur l'original est délibéré : une photo qu'on n'a pas su analyser
 * doit rester telle que vous l'avez fournie.
 */
export async function mettreAuCarre(fichier: File): Promise<File> {
  const analyse = await analyserImage(fichier)
  if (!analyse) return fichier
  try {
    return (await composerCarre(analyse)) || fichier
  } catch {
    return fichier
  } finally {
    analyse.source.close()
  }
}
