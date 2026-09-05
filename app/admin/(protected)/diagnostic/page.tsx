'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Écran de diagnostic des droits en base.
 *
 * Il n'apporte rien au commerce et n'a pas vocation à être consulté au
 * quotidien. Il existe parce qu'un refus des règles d'accès ne produit aucune
 * erreur : la page reste vide et se tait. Sans un endroit qui pose la question
 * franchement, la seule façon de savoir est de deviner.
 */
export default function AdminDiagnostic() {
  const [resultat, setResultat] = useState<Record<string, unknown> | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setErreur('Aucune session. Reconnectez vous à l administration.')
          return
        }
        const res = await fetch('/api/admin/diagnostic', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        setResultat(await res.json())
      } catch (e) {
        setErreur(e instanceof Error ? e.message : 'Cause inconnue.')
      }
    })()
  }, [])

  return (
    <div>
      <h1 className="font-serif font-semibold text-4xl text-ink mb-2">Diagnostic</h1>
      <p className="text-ink-dim mb-8 max-w-2xl">
        Cet écran compare ce que votre compte est autorisé à lire et ce que contient réellement la
        base. Si les deux nombres diffèrent, les commandes existent mais vous sont cachées.
      </p>

      {erreur && <p className="text-danger">{erreur}</p>}

      {!resultat && !erreur && <p className="text-ink-dim">Lecture en cours…</p>}

      {resultat && (
        <pre className="bg-bg-sunken border border-border rounded-lg p-5 text-sm text-ink overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(resultat, null, 2)}
        </pre>
      )}
    </div>
  )
}
