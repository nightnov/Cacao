'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import {
  AnalyseImage,
  Reglage,
  REGLAGE_NEUTRE,
  dessinerCarre,
} from '@/lib/imageCarre'

/**
 * Calibrage d'une photo avant envoi.
 *
 * Le cadrage automatique tombe juste la plupart du temps, mais pas toujours :
 * un reflet dans un coin empêche de reconnaître la marge, un accessoire posé à
 * côté de la machine élargit la zone utile. Plutôt que d'affiner indéfiniment
 * la détection, on vous montre le résultat et on vous laisse le corriger.
 *
 * L'aperçu passe par la même fonction de dessin que le fichier produit : un
 * aperçu calculé autrement mentirait sur ce que vous validez.
 */
const APERCU = 320

export function CalibrageImage({
  analyse,
  compteRestant,
  onValider,
  onAnnuler,
}: {
  analyse: AnalyseImage
  /** Nombre de photos encore en attente, affiché pour situer l'avancement. */
  compteRestant: number
  onValider: (reglage: Reglage) => void
  onAnnuler: () => void
}) {
  const canevas = useRef<HTMLCanvasElement>(null)
  const [reglage, setReglage] = useState<Reglage>(REGLAGE_NEUTRE)
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null)

  useEffect(() => {
    setReglage(REGLAGE_NEUTRE)
  }, [analyse])

  useEffect(() => {
    if (canevas.current) dessinerCarre(canevas.current, analyse, reglage)
  }, [analyse, reglage])

  const deplacer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!glisse.current) return
    const depart = glisse.current
    setReglage(r => ({
      ...r,
      dx: depart.dx + (e.clientX - depart.x) / APERCU,
      dy: depart.dy + (e.clientY - depart.y) / APERCU,
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-bg-panel border border-border rounded-xl w-full max-w-md p-5">
        <h3 className="font-semibold text-ink">Calibrer la photo</h3>
        <p className="text-xs text-ink-dimmer mt-1 mb-4">
          {analyse.rognee
            ? 'La marge vide a été retirée et la photo recadrée automatiquement.'
            : "Cette photo a un décor : rien n'a été rogné, son bord fait partie du sujet."}{' '}
          Ajustez si besoin, puis validez.
        </p>

        {/* Le damier rappelle la transparence : sans lui, une image détourée
            paraît posée sur un fond blanc qui n'existe pas dans le fichier. */}
        <div
          className="mx-auto rounded-lg border border-border overflow-hidden"
          style={{
            width: APERCU,
            height: APERCU,
            backgroundImage:
              'linear-gradient(45deg,rgb(var(--c-bg-raised)) 25%,transparent 25%),linear-gradient(-45deg,rgb(var(--c-bg-raised)) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgb(var(--c-bg-raised)) 75%),linear-gradient(-45deg,transparent 75%,rgb(var(--c-bg-raised)) 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
          }}
        >
          <canvas
            ref={canevas}
            width={APERCU}
            height={APERCU}
            className="cursor-move touch-none"
            onPointerDown={e => {
              e.currentTarget.setPointerCapture(e.pointerId)
              glisse.current = { x: e.clientX, y: e.clientY, dx: reglage.dx, dy: reglage.dy }
            }}
            onPointerMove={deplacer}
            onPointerUp={() => {
              glisse.current = null
            }}
            onPointerCancel={() => {
              glisse.current = null
            }}
          />
        </div>

        <label className="block mt-4">
          <span className="text-xs font-semibold text-ink">
            Taille dans le cadre : {Math.round(reglage.zoom * 100)} %
          </span>
          <input
            type="range"
            min={40}
            max={200}
            value={Math.round(reglage.zoom * 100)}
            onChange={e => setReglage(r => ({ ...r, zoom: Number(e.target.value) / 100 }))}
            className="w-full mt-1.5 accent-accent"
          />
        </label>
        <p className="text-xs text-ink-dimmer mt-1">
          Faites glisser la photo dans le cadre pour la déplacer.
        </p>

        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            type="button"
            onClick={() => setReglage(REGLAGE_NEUTRE)}
            className="text-xs font-semibold text-ink-dim hover:text-ink underline"
          >
            Revenir au cadrage automatique
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onAnnuler}>
              Ignorer cette photo
            </Button>
            <Button type="button" variant="primary" onClick={() => onValider(reglage)}>
              {compteRestant > 1 ? 'Valider et passer à la suivante' : 'Valider'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
