import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient<any, 'public', any> | null = null

export function getSupabaseClient(): SupabaseClient<any, 'public', any> {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }
  return supabaseClient
}
