'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { btn } from '@/lib/ui'

/**
 * Bandeau de consentement aux cookies.
 *
 * Le choix est conservé dans le navigateur, pas en base : c'est un réglage
 * propre à l'appareil, et le rattacher à un compte obligerait à identifier un
 * visiteur avant même qu'il ait accepté d'être suivi.
 *
 * Refuser est aussi facile qu'accepter — deux boutons de même taille, côte à
 * côte. Un bandeau où seul « Accepter » est visible n'est pas un consentement,
 * c'est un passage forcé, et il n'a aucune valeur juridique.
 *
 * Le bandeau n'apparaît qu'une fois le choix inconnu vérifié côté navigateur,
 * ce qui évite de le voir surgir puis disparaître sur les pages pré-rendues.
 */
const STORAGE_KEY = 'cacao-cookies'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // Navigation privée ou stockage refusé : on n'insiste pas. Un bandeau
      // qu'on ne peut pas faire disparaître serait pire que pas de bandeau.
    }
  }, [])

  const choisir = (valeur: 'accepte' | 'refuse') => {
    try {
      localStorage.setItem(STORAGE_KEY, valeur)
    } catch {
      // Sans stockage, le choix vaut pour la visite en cours.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="max-w-3xl mx-auto rounded-xl border border-border bg-bg-panel shadow-lg p-4 sm:p-5">
        <p className="text-[13.5px] text-ink-dim leading-relaxed">
          Nous utilisons des cookies pour faire fonctionner votre panier et votre connexion, et
          pour mesurer la fréquentation du site. Vous pouvez refuser la mesure sans perdre
          l&apos;usage du site.{' '}
          <Link href="/legal/privacy" className="text-accent underline underline-offset-2">
            En savoir plus
          </Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 mt-3.5">
          {/* Deux boutons de même taille : refuser doit coûter le même geste
              qu'accepter, sinon le consentement n'en est pas un. */}
          <button type="button" onClick={() => choisir('accepte')} className={btn('solid', 'md', 'flex-1')}>
            Accepter
          </button>
          <button type="button" onClick={() => choisir('refuse')} className={btn('sober', 'md', 'flex-1')}>
            Refuser
          </button>
        </div>
      </div>
    </div>
  )
}
