'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CalibrageImage } from '@/components/admin/CalibrageImage'
import { analyserImage, composerCarre, AnalyseImage, Reglage } from '@/lib/imageCarre'
import { rapatrierImage } from '@/lib/imageDistante'

/**
 * Calibrage d'une image, partout où l'on peut en déposer une.
 *
 * La mise au carré n'existait que sur la fiche produit. Les rayons, la
 * bannière, le glossaire et les options recevaient l'image telle quelle : une
 * photo trop large, trop petite ou mal centrée s'installait sans que rien ne
 * permette de la reprendre. Or c'est le même geste et la même attente partout.
 *
 * Plutôt que de recopier la logique dans chaque écran, le crochet expose une
 * seule fonction : vous lui donnez un fichier, elle vous en rend un prêt à
 * envoyer. L'écran appelant garde son propre envoi, son propre seau et sa
 * propre table — rien de ce qui marche déjà n'est déplacé.
 *
 * Trois cas de retour, à distinguer :
 *
 *   • un fichier recadré, quand vous validez ;
 *   • le fichier d'origine, quand l'analyse ne sait pas le lire — il n'y a
 *     rien à calibrer sur une lecture ratée, et refuser l'image serait pire ;
 *   • `null`, quand vous renoncez. L'appelant ne doit alors rien envoyer.
 */
export function useCalibrage(ratio = 1) {
  const [analyse, setAnalyse] = useState<AnalyseImage | null>(null)
  const [remplacement, setRemplacement] = useState(false)
  const resolveur = useRef<((fichier: File | null) => void) | null>(null)

  /**
   * Une promesse en attente au démontage n'est jamais tenue.
   *
   * Si l'écran disparaît pendant le calibrage — onglet fermé, ligne repliée —
   * l'appelant resterait bloqué sur un `await` que plus personne ne résoudra,
   * son indicateur d'envoi tournant indéfiniment. On le libère par un renoncement.
   */
  useEffect(() => {
    return () => {
      resolveur.current?.(null)
      resolveur.current = null
    }
  }, [])

  const calibrer = useCallback(
    async (fichier: File, options?: { remplacement?: boolean }): Promise<File | null> => {
      const lue = await analyserImage(fichier)
      if (!lue) return fichier

      // Un calibrage déjà ouvert est abandonné plutôt qu'écrasé : sans cela son
      // appelant attendrait une réponse qui ne viendrait plus.
      resolveur.current?.(null)

      setRemplacement(!!options?.remplacement)
      setAnalyse(lue)
      return new Promise<File | null>(resoudre => {
        resolveur.current = resoudre
      })
    },
    []
  )

  /**
   * Même chose à partir d'une adresse, pour reprendre une image déjà en place.
   *
   * Une image qu'on ne peut pas rapatrier n'est pas une erreur à signaler :
   * elle est simplement hors de portée du recadrage.
   */
  const calibrerDepuisUrl = useCallback(
    async (url: string, seau?: string): Promise<File | null> => {
      const fichier = await rapatrierImage(url, seau)
      if (!fichier) return null
      return calibrer(fichier, { remplacement: true })
    },
    [calibrer]
  )

  const terminer = useCallback(
    async (reglage: Reglage | null) => {
      const courante = analyse
      const resoudre = resolveur.current
      resolveur.current = null
      setAnalyse(null)
      if (!courante || !resoudre) return

      try {
        resoudre(reglage ? await composerCarre(courante, reglage, ratio) : null)
      } catch {
        resoudre(null)
      } finally {
        courante.source.close()
      }
    },
    [analyse, ratio]
  )

  const modaleCalibrage = analyse ? (
    <CalibrageImage
      analyse={analyse}
      compteRestant={1}
      remplacement={remplacement}
      ratio={ratio}
      onValider={reglage => void terminer(reglage)}
      onAnnuler={() => void terminer(null)}
    />
  ) : null

  return { calibrer, calibrerDepuisUrl, modaleCalibrage }
}
