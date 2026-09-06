import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { limiteAtteinte } from '@/lib/rateLimit.server'

/**
 * Inscription à la lettre d'information.
 *
 * L'écriture se faisait directement depuis le navigateur, avec la clé publique
 * du site, lisible dans la page. N'importe qui pouvait donc inscrire des
 * milliers d'adresses fabriquées — ou pire, les adresses réelles de tiers, ce
 * qui aurait fait de vos envois du courrier non sollicité au nom de CACAO.
 *
 * Cinq inscriptions par heure et par appareil : une personne qui inscrit son
 * adresse, se trompe, et recommence, reste largement dans les clous.
 */
const MAX_PAR_HEURE = 5

export async function POST(request: Request) {
  let corps: { email?: unknown }
  try {
    corps = await request.json()
  } catch {
    return Response.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const email = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : ''
  // Vérification volontairement simple : elle écarte le contenu arbitraire,
  // pas les adresses inhabituelles. Une expression trop stricte finit toujours
  // par refuser une adresse valide.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return Response.json({ error: 'Adresse invalide.' }, { status: 400 })
  }

  if (await limiteAtteinte({ request, seau: 'lettre', max: MAX_PAR_HEURE })) {
    return Response.json(
      { error: 'Trop de tentatives. Réessayez dans une heure.' },
      { status: 429 }
    )
  }

  const { error } = await getSupabaseAdmin()
    .from('newsletter_subscribers')
    .insert([{ email }])

  // 23505 : adresse déjà inscrite. Ce n'est pas un échec du point de vue du
  // visiteur, qui voulait précisément être dans la liste.
  if (error && error.code !== '23505') {
    console.error('Inscription impossible :', error)
    return Response.json({ error: 'Inscription impossible pour le moment.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
