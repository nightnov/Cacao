import React from 'react'
import { btn, type BtnSize, type BtnVariant } from '@/lib/ui'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
}

/**
 * Bouton des pages publiques.
 *
 * Le style par défaut est désormais `sober` — encadré, fond transparent — et
 * non plus l'aplat plein. Les aplats sont l'exception, réservés à l'action
 * principale d'un écran ; c'est ce qui leur rend leur poids.
 *
 * Les classes vivent dans `lib/ui.ts`, partagées avec les nombreux boutons
 * écrits directement en `<Link>` qui ne peuvent pas passer par ce composant.
 */
export function Button({
  variant = 'sober',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button className={btn(variant, size, className)} {...props}>
      {children}
    </button>
  )
}
