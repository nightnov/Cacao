'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Ce qui manque avant de pouvoir vendre.
 *
 * Chaque point listé ici correspond à un moment où un vrai client se
 * retrouverait bloqué, sans que rien ne vous en avertisse : un retrait sur
 * place proposé sans adresse où venir, une page contact sans numéro, un rayon
 * annoncé dans le menu qui s'ouvre sur le vide.
 *
 * La liste ne mesure que des faits en base. Elle ne félicite pas et ne conseille
 * rien : elle disparaît quand il n'y a plus rien à signaler, et c'est le seul
 * message qu'elle a à porter.
 */
interface Manque {
  quoi: string
  ou: string
}

export function OuvertureChecklist() {
  const [manques, setManques] = useState<Manque[] | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const [reglages, produits] = await Promise.all([
          supabase.from('site_settings').select('key, value'),
          supabase.from('products').select('id, status').eq('status', 'active'),
        ])

        const valeur = new Map(
          (reglages.data || []).map(r => [r.key, (r.value || '').toString().trim()])
        )
        const trouve: Manque[] = []

        // Le retrait sur place n'est un problème que s'il est proposé : activé
        // sans adresse, le client choisit une option qui ne lui dit pas où
        // aller, et il appelle pour le demander.
        if (valeur.get('pickup_enabled') === 'true' && !valeur.get('pickup_address')) {
          trouve.push({
            quoi: 'Le retrait sur place est proposé mais aucune adresse n est renseignée',
            ou: 'Livraison',
          })
        }

        if (!valeur.get('shop_phone')) {
          trouve.push({ quoi: 'Aucun numéro de téléphone sur la page contact', ou: 'Réglages' })
        }
        if (!valeur.get('shop_whatsapp')) {
          trouve.push({ quoi: 'Aucun numéro WhatsApp pour vos clients', ou: 'Réglages' })
        }

        const actifs = (produits.data || []).length
        if (actifs === 0) {
          trouve.push({ quoi: 'Aucun produit publié : le catalogue est vide', ou: 'Produits' })
        } else if (actifs < 6) {
          trouve.push({
            quoi: `Seulement ${actifs} produits publiés, le catalogue paraît en construction`,
            ou: 'Produits',
          })
        }

        setManques(trouve)
      } catch {
        // Silencieux : cet écran informe, il ne doit pas remplacer le tableau
        // de bord par un message d'erreur.
        setManques([])
      }
    })()
  }, [])

  if (!manques || manques.length === 0) return null

  return (
    <div className="mb-8 rounded-xl border border-gold/40 bg-gold/10 p-5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={18} className="text-gold flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {manques.length} point{manques.length > 1 ? 's' : ''} à régler avant d ouvrir
          </p>
          <ul className="mt-2 space-y-1.5">
            {manques.map(m => (
              <li key={m.quoi} className="text-sm text-ink-dim">
                {m.quoi}
                <span className="text-ink-dimmer"> · {m.ou}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
