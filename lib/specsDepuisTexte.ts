/**
 * Lecture des caractéristiques dans le texte d'une annonce.
 *
 * Les places de marché ivoiriennes ne publient presque jamais de données
 * structurées : le processeur, la mémoire et le disque sont écrits en toutes
 * lettres dans le titre ou le descriptif, dans une orthographe libre. Ce module
 * les y cherche.
 *
 * Deux règles gouvernent tout ce fichier :
 *
 * 1. Le doute ne remplit rien. Une caractéristique n'est retenue que si le
 *    texte la nomme explicitement. Une case vide se voit et se corrige ; une
 *    case fausse se recopie sur la fiche et se retrouve dans la description
 *    lue par le client.
 * 2. Rien n'est déduit d'une absence. Un texte qui ne dit pas « neuf » ne
 *    signifie pas « occasion », et inversement.
 */

export interface SpecsDetectees {
  cpu?: string
  ram?: string
  storage?: string
  screen?: string
  gpu?: string
  os?: string
}

export interface LectureAnnonce extends SpecsDetectees {
  /** Clé de rayon devinée, à confronter aux rayons réellement ouverts. */
  category?: string
  /** Clé d'état, uniquement si l'annonce l'écrit sans ambiguïté. */
  item_condition?: string
}

/** Normalise pour la recherche : accents retirés, espaces resserrés. */
function aplatir(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function premier(texte: string, motifs: RegExp[]): RegExpMatchArray | null {
  for (const motif of motifs) {
    const trouve = texte.match(motif)
    if (trouve) return trouve
  }
  return null
}

/** Met une majuscule en tête sans toucher au reste (les sigles restent intacts). */
function capitale(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1)
}

function lireCpu(t: string): string | undefined {
  // Apple : la puce se nomme seule, sans fabricant devant.
  const apple = t.match(/\bapple\s+(m[1-4])\s*(pro|max|ultra)?\b/)
  if (apple) return `Apple ${apple[1].toUpperCase()}${apple[2] ? ' ' + capitale(apple[2]) : ''}`

  // Intel Core : « core i7 1165G7 », « i5-8250U », « core i5 8eme generation ».
  const core = t.match(/\b(?:intel\s+)?(?:core\s+)?(i[3579])\b[\s-]*((?:\d{4,5}[a-z]{0,2})|(?:\d{1,2}\s*(?:e|eme|th|nd|rd|st)\s*(?:gen|generation)))?/)
  if (core) {
    const modele = core[2]?.replace(/\s+/g, ' ').trim()
    const suffixe = modele
      ? /gen|generation/.test(modele)
        ? ` ${modele.replace(/\s*(?:e|eme|th|nd|rd|st)\s*(?:gen|generation)/, 'e génération')}`
        : ` ${modele.toUpperCase()}`
      : ''
    return `Intel Core ${core[1]}${suffixe}`
  }

  const ryzen = t.match(/\bryzen\s*([3579])\b[\s-]*(\d{4}[a-z]{0,2})?/)
  if (ryzen) return `AMD Ryzen ${ryzen[1]}${ryzen[2] ? ' ' + ryzen[2].toUpperCase() : ''}`

  const autre = t.match(/\b(celeron|pentium|xeon|athlon|atom)\b[\s-]*([a-z]?\d{3,5}[a-z]{0,2})?/)
  if (autre) return `Intel ${capitale(autre[1])}${autre[2] ? ' ' + autre[2].toUpperCase() : ''}`.replace('Intel Athlon', 'AMD Athlon')

  return undefined
}

/**
 * Façons d'écrire un gigaoctet et un téraoctet dans une annonce.
 *
 * « Go » et « GB » ne suffisent pas : sur les places de marché locales on lit
 * couramment « 8giga », « 256 gig », « 1 tera », souvent sans espace avant
 * l'unité. Écarter ces graphies revenait à ne rien lire du tout sur la plupart
 * des annonces.
 */
const GIGA = '(?:go|gb|giga(?:s|octets?)?|gig|g)'
const TERA = '(?:to|tb|tera(?:s|octets?)?|t)'

function lireRam(t: string): string | undefined {
  // La taille n'est retenue que collée au mot mémoire : sans ça, « 8 Go » peut
  // tout aussi bien désigner une clé USB citée plus bas dans l'annonce.
  const taille = premier(t, [
    new RegExp(`\\b(?:memoire(?:\\s+vive)?|ram)\\s*[:\\-]?\\s*(\\d{1,3})\\s*${GIGA}\\b`),
    new RegExp(`\\b(\\d{1,3})\\s*${GIGA}\\s*(?:de\\s+)?(?:ram|memoire|ddr)`),
  ])
  if (!taille) return undefined

  const octets = Number(taille[1])
  // Au delà de 256 Go de mémoire vive on lit un disque mal formulé, pas de la RAM.
  if (!octets || octets > 256) return undefined

  const type = t.match(/\b(lpddr[345]x?|ddr[2345]l?)\b/)
  return `${octets} Go${type ? ' ' + type[1].toUpperCase() : ''}`
}

function lireStockage(t: string): string | undefined {
  // Le type de support est exigé : c'est lui qui distingue un disque d'une
  // quantité de mémoire ou d'un forfait de données.
  const support = '(ssd|nvme|emmc|hdd|disque dur|disque)'

  const enTo = premier(t, [
    new RegExp(`\\b(\\d(?:[.,]\\d)?)\\s*${TERA}\\s*(?:de\\s+)?${support}`),
    new RegExp(`\\b${support}\\s*(?:de\\s+)?(\\d(?:[.,]\\d)?)\\s*${TERA}\\b`),
  ])
  if (enTo) {
    const nombre = (enTo[1].match(/\d/) ? enTo[1] : enTo[2]).replace('.', ',')
    const type = (enTo[1].match(/\d/) ? enTo[2] : enTo[1]) || ''
    return `${nombre} To${etiquetteSupport(type)}`
  }

  const enGo = premier(t, [
    new RegExp(`\\b(\\d{3,4})\\s*${GIGA}\\s*(?:de\\s+)?${support}`),
    new RegExp(`\\b${support}\\s*(?:de\\s+)?(\\d{3,4})\\s*${GIGA}\\b`),
  ])
  if (enGo) {
    const nombre = enGo[1].match(/\d/) ? enGo[1] : enGo[2]
    const type = (enGo[1].match(/\d/) ? enGo[2] : enGo[1]) || ''
    return `${nombre} Go${etiquetteSupport(type)}`
  }

  return undefined
}

function etiquetteSupport(brut: string): string {
  const type = brut.trim()
  if (!type) return ''
  if (type === 'nvme') return ' NVMe'
  if (type === 'emmc') return ' eMMC'
  if (type === 'ssd') return ' SSD'
  if (type === 'hdd') return ' HDD'
  return '' // « disque dur » n'ajoute rien à « 500 Go »
}

function lireEcran(t: string): string | undefined {
  const taille = premier(t, [
    /\b(\d{1,2}[.,]\d)\s*(?:pouces?|"|''|inch)/,
    /\b(1[0-9]|2[0-9]|3[0-9])\s*(?:pouces?|"|''|inch)\b/,
    /\becran\s*(?:de\s*)?(\d{1,2}(?:[.,]\d)?)\b/,
  ])
  if (!taille) return undefined

  const pouces = taille[1].replace('.', ',')
  const definition = premier(t, [
    /\b(\d{3,4}\s*x\s*\d{3,4})\b/,
    /\b(full\s*hd|fhd|4k|uhd|qhd|retina|hd\+?)\b/,
  ])
  if (!definition) return `${pouces} pouces`

  const lisible = definition[1]
    .replace(/\s+/g, '')
    .replace(/^fullhd$|^fhd$/, 'Full HD')
    .replace(/^4k$|^uhd$/i, '4K')
    .replace(/^qhd$/i, 'QHD')
    .replace(/^retina$/i, 'Retina')
    .replace(/^hd\+?$/i, 'HD')
  return `${pouces} pouces, ${lisible}`
}

function lireGpu(t: string): string | undefined {
  const nvidia = t.match(/\b(?:geforce\s*)?(rtx|gtx|mx)\s*-?\s*(\d{3,4})\s*(ti|super)?\b/)
  if (nvidia) {
    const suffixe = nvidia[3] ? ' ' + capitale(nvidia[3]) : ''
    return `NVIDIA GeForce ${nvidia[1].toUpperCase()} ${nvidia[2]}${suffixe}`
  }

  const radeon = t.match(/\bradeon\s*(rx)?\s*(\d{3,4}\s*[a-z]{0,2})?/)
  if (radeon) return `AMD Radeon${radeon[1] ? ' RX' : ''}${radeon[2] ? ' ' + radeon[2].trim().toUpperCase() : ''}`

  if (/\biris\s*xe\b/.test(t)) return 'Intel Iris Xe'
  if (/\buhd\s*graphics\b/.test(t)) return 'Intel UHD Graphics'
  if (/\bhd\s*graphics\b/.test(t)) return 'Intel HD Graphics'

  return undefined
}

function lireOs(t: string): string | undefined {
  const windows = t.match(/\bwindows\s*(11|10|8\.1|8|7)\s*(pro|home|familiale|entreprise)?\b/)
  if (windows) return `Windows ${windows[1]}${windows[2] ? ' ' + capitale(windows[2]) : ''}`
  if (/\bmac\s*os\b|\bmacos\b/.test(t)) return 'macOS'
  if (/\bchrome\s*os\b/.test(t)) return 'ChromeOS'
  if (/\bubuntu\b/.test(t)) return 'Ubuntu'
  if (/\bfree\s*dos\b/.test(t)) return 'FreeDOS'
  if (/\blinux\b/.test(t)) return 'Linux'
  return undefined
}

/**
 * Rayon deviné.
 *
 * L'ordre compte : « pc portable gamer » doit atterrir dans Gaming, pas dans
 * Portables. Les mentions les plus spécifiques sont donc testées d'abord.
 */
function lireRayon(t: string): string | undefined {
  if (/\bgamer\b|\bgaming\b|\bde\s+jeu\b/.test(t)) return 'gaming'
  // Les gammes citées ici ne désignent que des portables : une annonce qui dit
  // « EliteBook » sans jamais écrire « portable » se classe quand même.
  if (
    /\bpc\s*portable\b|\bordinateur\s+portable\b|\blaptop\b|\bnotebook\b|\bmacbook\b|\bultrabook\b/.test(t) ||
    /\belite\s?book\b|\bpro\s?book\b|\bthinkpad\b|\bideapad\b|\blatitude\b|\binspiron\b|\bpavilion\b|\bvivobook\b|\bzenbook\b|\bchromebook\b/.test(t)
  ) {
    return 'portable'
  }
  if (/\bunite\s+centrale\b|\bpc\s*(?:de\s*)?bureau\b|\bdesktop\b|\btour\b|\ball\s*in\s*one\b|\bimac\b/.test(t)) return 'bureau'
  if (/\bprocesseur\b|\bcarte\s+mere\b|\bcarte\s+graphique\b|\bbarrette\b|\balimentation\b|\bventirad\b/.test(t)) return 'composants'
  if (/\bsouris\b|\bclavier\b|\bcasque\b|\bsacoche\b|\bchargeur\b|\bcable\b|\bhub\b|\bwebcam\b|\bsac\s+a\s+dos\b/.test(t)) return 'accessoire'
  return undefined
}

/**
 * État de l'appareil.
 *
 * Le vocabulaire des annonces n'a pas d'équivalent pour tout : « occasion »,
 * « venant », « seconde main » décrivent du matériel usagé, et la liste d'états
 * du site n'en propose aucun. Dans ce cas la fonction ne renvoie rien plutôt
 * que d'arrondir vers le haut : promettre du reconditionné pour de l'occasion
 * serait un engagement que personne n'a pris.
 *
 * « neuf » sans autre précision donne « carton ouvert », le moins avantageux
 * des deux états neufs. Se tromper dans ce sens n'engage à rien de plus que ce
 * qui sera livré.
 */
function lireEtat(t: string): string | undefined {
  if (/\bscelle[es]?\b|\bsous\s+emballage\b|\bjamais\s+ouvert\b|\bblister\b/.test(t)) return 'neuf_scelle'
  if (/\breconditionne[es]?\b|\brefurbished\b|\bremis\s+(?:a\s+neuf|en\s+etat)\b/.test(t)) return 'reconditionne'
  if (/\btres\s+peu\s+(?:servi|utilise)\b|\bpeu\s+servi\b/.test(t)) return 'quasi_neuf'
  if (/\bneuf\b|\bneuve\b|\bbrand\s+new\b/.test(t)) return 'neuf_ouvert'
  return undefined
}

/**
 * Lit ce qui est identifiable dans une annonce.
 *
 * Les deux sources ne sont pas de même valeur, et c'est pour ça qu'elles sont
 * séparées ici. Le titre et le descriptif sont écrits par le vendeur et ne
 * parlent que de son article. Le corps de la page, lui, contient aussi les
 * menus du site : la page CoinAfrique embarque la liste complète des villes,
 * des rayons et des filtres, dont une case « Produit neuf » et un rayon
 * « Véhicules ». Chercher l'état ou le rayon là dedans revenait à annoncer du
 * neuf sur toutes les annonces, y compris celles d'occasion.
 *
 * Le corps ne sert donc qu'aux caractéristiques techniques, que les menus du
 * site ne contiennent pas ; le rayon et l'état viennent du vendeur seul.
 */
export function lireAnnonce(
  titre?: string | null,
  descriptif?: string | null,
  corps?: string | null
): LectureAnnonce {
  const duVendeur = aplatir([titre, descriptif].filter(Boolean).join(' \n '))
  const tout = aplatir([titre, descriptif, corps].filter(Boolean).join(' \n '))
  if (!tout.trim()) return {}

  const lecture: LectureAnnonce = {
    cpu: lireCpu(tout),
    ram: lireRam(tout),
    storage: lireStockage(tout),
    screen: lireEcran(tout),
    gpu: lireGpu(tout),
    os: lireOs(tout),
    category: lireRayon(duVendeur),
    item_condition: lireEtat(duVendeur),
  }

  // Les clés sans valeur sont retirées : le formulaire distingue « rien trouvé »
  // de « trouvé vide », et ne doit jamais écraser une saisie par du vide.
  return Object.fromEntries(Object.entries(lecture).filter(([, v]) => v)) as LectureAnnonce
}
