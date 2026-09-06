import { createHash } from 'crypto'
import { getSupabaseAdmin } from './supabaseAdmin'

/**
 * Limite d'appels par appareil, comptée en base.
 *
 * Trois tables acceptaient jusqu'ici les écritures de n'importe quel visiteur :
 * le journal des recherches, le compteur de vues et les inscriptions à la
 * lettre d'information. C'était nécessaire pour qu'elles fonctionnent sans
 * connexion, mais rien ne bornait le volume. Un script pouvait y verser des
 * millions de lignes, épuiser le quota de la base — que vous payez — et
 * rendre vos statistiques inutilisables.
 *
 * Le comptage vit en base et non en mémoire : le site tourne sur des serveurs
 * sans état, où deux requêtes successives n'atterrissent pas forcément au même
 * endroit. Un compteur en mémoire se réinitialiserait à chaque déploiement et
 * ne verrait qu'une fraction du trafic.
 */

/**
 * L'adresse n'est jamais conservée en clair : compter des appels ne demande
 * pas de savoir qui les passe. La clé de service sert de sel, ce qui empêche
 * de retrouver une adresse en essayant toutes les adresses possibles.
 */
export function empreinteAppareil(request: Request): string {
  const transmise = request.headers.get('x-forwarded-for') || ''
  const adresse =
    transmise.split(',')[0].trim() || request.headers.get('x-real-ip') || 'inconnue'
  return createHash('sha256')
    .update(`${adresse}|${process.env.SUPABASE_SERVICE_ROLE_KEY || 'cacao'}`)
    .digest('hex')
}

/**
 * Enregistre l'appel et dit s'il dépasse la limite.
 *
 * L'écriture a lieu même quand la limite est atteinte : sans cela, un
 * assaillant qui continue de frapper verrait sa fenêtre glisser et repartir,
 * et la limite ne tiendrait jamais.
 */
export async function limiteAtteinte({
  request,
  seau,
  max,
  fenetreMinutes = 60,
}: {
  request: Request
  seau: string
  max: number
  fenetreMinutes?: number
}): Promise<boolean> {
  const db = getSupabaseAdmin()
  const empreinte = empreinteAppareil(request)
  const depuis = new Date(Date.now() - fenetreMinutes * 60_000).toISOString()

  const { count, error } = await db
    .from('rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', seau)
    .eq('ip_hash', empreinte)
    .gte('created_at', depuis)

  if (error) {
    /**
     * Tant que la migration 048 n'est pas appliquée, la table n'existe pas et
     * le comptage échoue. On laisse alors passer : refuser reviendrait à
     * couper la recherche et les inscriptions du site entier pour une table
     * manquante. Mais on le dit, plutôt que de laisser croire à une
     * protection qui ne protège rien — c'est exactement le genre de silence
     * qui donne une fausse tranquillité.
     */
    console.error(
      `Limitation impossible sur « ${seau} » : ${error.message}. ` +
        'Appliquez la migration 048, sinon les écritures publiques restent sans borne.'
    )
    return false
  }

  await db.from('rate_events').insert([{ bucket: seau, ip_hash: empreinte }])

  return (count ?? 0) >= max
}
