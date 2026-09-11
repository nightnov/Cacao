import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client réservé aux routes serveur (API routes / webhooks). Utilise la clé
// service_role qui contourne RLS - ne JAMAIS importer ce fichier dans un
// composant client ('use client') ni exposer cette clé au navigateur.
let supabaseAdmin: SupabaseClient<any, 'public', any> | null = null

export function getSupabaseAdmin(): SupabaseClient<any, 'public', any> {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
        /**
         * Aucune réponse gardée en mémoire.
         *
         * Next remplace la fonction `fetch` du serveur par une version qui
         * conserve les réponses, classées par adresse. Ce client sert au
         * recalcul du montant à payer, au décompte du stock et au traitement
         * des paiements : y servir une réponse d'hier ferait facturer un
         * ancien prix ou vendre un article déjà parti. Rien ici ne tolère une
         * lecture périmée.
         */
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )
  }
  return supabaseAdmin
}
