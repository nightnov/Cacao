import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { limiteAtteinte } from '@/lib/rateLimit.server'

/**
 * Enregistrement d'une vue produit.
 *
 * L'écriture se faisait directement depuis le navigateur. La clé publique du
 * site étant lisible dans la page, n'importe qui pouvait appeler la base en
 * boucle et gonfler le compteur d'un produit — ou simplement remplir la table
 * jusqu'à épuiser le quota. Un compteur de popularité qu'on peut fabriquer ne
 * mesure plus rien, et c'est lui qui décide de l'ordre « Plus populaires ».
 *
 * Trente vues par heure et par appareil : un visiteur curieux qui parcourt le
 * catalogue reste très en dessous, et le comptage cesse d'être une machine à
 * fabriquer des ventes imaginaires.
 */
const MAX_VUES_PAR_HEURE = 30

export async function POST(request: Request) {
  let corps: { product_id?: unknown }
  try {
    corps = await request.json()
  } catch {
    return Response.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const produit = typeof corps.product_id === 'string' ? corps.product_id.trim() : ''
  // Format d'identifiant vérifié avant toute écriture : une valeur libre
  // finirait par remplir la table de contenu arbitraire.
  if (!/^[0-9a-f-]{36}$/i.test(produit)) {
    return Response.json({ error: 'Produit inconnu.' }, { status: 400 })
  }

  if (await limiteAtteinte({ request, seau: 'vue', max: MAX_VUES_PAR_HEURE })) {
    // On ne renvoie pas d'erreur : la vue est une statistique, pas une action
    // du visiteur. Lui afficher un échec pour un comptage interne n'aurait
    // aucun sens.
    return Response.json({ ok: true })
  }

  await getSupabaseAdmin().from('product_views').insert([{ product_id: produit }])

  return Response.json({ ok: true })
}
