'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { getVideoEmbedUrl, getVideoThumbnail } from '@/lib/video'

export interface GalleryMedia {
  type: 'image' | 'video'
  /** Adresse de l'image, ou adresse de la vidéo pour une vignette vidéo. */
  src: string
}

/**
 * Galerie de la fiche produit : grande zone média, vignettes en dessous.
 *
 * Les photos sont des PNG détourés : elles sont donc centrées en `contain` et
 * jamais recadrées. Un `cover` couperait précisément ce qu'on cherche à
 * montrer, et sur un fond sombre le détourage ne se verrait plus.
 *
 * La vignette vidéo n'apparaît que si une adresse a été saisie en
 * administration. Sans vidéo, aucune case vide n'est laissée dans la rangée.
 */
export function ProductGallery({
  images,
  videoUrl,
  /** Image imposée par la configuration choisie — une couleur, par exemple. */
  forcedImage,
  productName,
}: {
  images: string[]
  videoUrl?: string | null
  forcedImage?: string | null
  productName: string
}) {
  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null
  const videoThumb = videoUrl ? getVideoThumbnail(videoUrl) : null

  const media = useMemo<GalleryMedia[]>(() => {
    const list: GalleryMedia[] = images.filter(Boolean).map(src => ({ type: 'image', src }))
    // La vidéo n'entre dans la galerie que si elle est réellement lisible :
    // une adresse mal formée donnerait une vignette qui n'ouvre rien.
    if (videoUrl && embedUrl) list.push({ type: 'video', src: videoUrl })
    return list
  }, [images, videoUrl, embedUrl])

  const [active, setActive] = useState(0)

  // Choisir une couleur doit changer le visuel affiché. On se cale sur l'image
  // de la valeur si elle fait partie de la galerie ; sinon elle est montrée
  // telle quelle, sans perdre les vignettes.
  useEffect(() => {
    if (!forcedImage) return
    const index = media.findIndex(m => m.type === 'image' && m.src === forcedImage)
    if (index >= 0) setActive(index)
  }, [forcedImage, media])

  useEffect(() => {
    if (active >= media.length) setActive(0)
  }, [active, media.length])

  const current = media[active]

  // Aucune image et aucune vidéo : on n'affiche pas un cadre vide, la colonne
  // de droite occupe alors toute la largeur.
  if (media.length === 0 && !forcedImage) return null

  const shownImage =
    forcedImage && !media.some(m => m.type === 'image' && m.src === forcedImage)
      ? forcedImage
      : current?.type === 'image'
        ? current.src
        : null

  return (
    <div>
      {/* Zone principale. Hauteur fixe : sans elle, une image très haute
          étirait la colonne et désalignait les informations d'achat. */}
      <div className="relative rounded-xl border border-border bg-bg-panel overflow-hidden h-[300px] sm:h-[420px] flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,rgb(var(--c-bg-raised)/0.55),transparent_70%)]"
        />
        {current?.type === 'video' && embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Vidéo de présentation — ${productName}`}
            className="relative w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : shownImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownImage}
            alt={productName}
            className="relative w-full h-full object-contain p-6"
          />
        ) : null}
      </div>

      {/* Vignettes. Masquées s'il n'y a qu'un seul média : une rangée d'une
          seule vignette sous l'image n'apporte rien. */}
      {media.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {media.map((m, i) => {
            const isActive = i === active
            return (
              <button
                key={`${m.type}-${m.src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                /* Survol autant que clic : le brief demande que la vidéo
                   s'affiche aussi au survol de sa vignette. */
                onMouseEnter={() => setActive(i)}
                aria-label={
                  m.type === 'video' ? 'Voir la vidéo du produit' : `Voir l'image ${i + 1}`
                }
                aria-current={isActive}
                className={`relative flex-shrink-0 w-[70px] h-[70px] rounded-lg border overflow-hidden bg-bg-panel transition-colors ${
                  isActive ? 'border-accent' : 'border-border hover:border-border-strong'
                }`}
              >
                {m.type === 'video' ? (
                  <>
                    {videoThumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={videoThumb} alt="" className="w-full h-full object-cover opacity-70" />
                    )}
                    {/* Icône de lecture : c'est elle qui distingue la vignette
                        vidéo des photos au premier coup d'œil. */}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-7 h-7 rounded-full bg-black/60 border border-ink/40 flex items-center justify-center">
                        <Play size={13} className="text-ink translate-x-[1px]" fill="currentColor" />
                      </span>
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.src} alt="" className="w-full h-full object-contain p-1.5" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
