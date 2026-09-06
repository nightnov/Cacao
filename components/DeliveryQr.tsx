'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * Le code de livraison sous forme de QR, à montrer au livreur.
 *
 * Le livreur qui enchaîne les courses n'a pas envie de taper six chiffres sur
 * un clavier de téléphone, sous la pluie ou une main prise par le carton. Il
 * scanne, la page s'ouvre avec le code déjà rempli, il valide.
 *
 * Ce QR est affiché chez le CLIENT, jamais sur le colis ni dans un message.
 * C'est le même principe que le code lui même : celui qui doit prouver la
 * remise ne détient pas la preuve à l'avance. Un QR collé sur le carton
 * donnerait au transporteur, et à quiconque le croise, la possibilité de
 * confirmer une livraison qui n'a pas eu lieu.
 *
 * Le code reste écrit en clair sous l'image : un téléphone sans appareil photo
 * disponible, un écran fêlé ou une application de scan absente ne doivent pas
 * bloquer une livraison.
 */
export function DeliveryQr({ code }: { code: string }) {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    const url = `${window.location.origin}/livraison?c=${encodeURIComponent(code)}`

    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      // Fond blanc et motif noir quel que soit le thème du site : un QR aux
      // couleurs de la marque devient illisible pour beaucoup d'appareils, et
      // un scan raté au moment de la remise fait perdre le temps qu'on
      // cherchait à gagner.
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(d => {
        if (!annule) setImage(d)
      })
      .catch(() => {
        // Sans image, le code en clair suffit. On ne bloque pas une livraison
        // pour un dessin qui n'a pas pu être produit.
      })

    return () => {
      annule = true
    }
  }, [code])

  if (!image) return null

  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={`Code de livraison ${code}`}
        className="w-40 h-40 rounded-lg bg-white p-2"
      />
      <p className="mt-2 text-xs text-ink-dim text-center max-w-[240px]">
        Le livreur scanne ce code au moment où il vous remet le colis. Il peut aussi saisir les
        chiffres à la main.
      </p>
    </div>
  )
}
