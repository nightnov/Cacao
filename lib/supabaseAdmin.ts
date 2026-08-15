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
      { auth: { persistSession: false } }
    )
  }
  return supabaseAdmin
}
