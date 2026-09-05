import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'

/**
 * Purge du cache de la vitrine après une modification en administration.
 *
 * La page d'accueil est pré-rendue et régénérée au plus toutes les cinq
 * minutes. C'est ce qui la rend instantanée à l'affichage, mais cela voulait
 * dire qu'un prix corrigé en administration continuait d'apparaître à l'ancien
 * montant pendant ce délai — sans que rien ne l'explique, et en donnant
 * l'impression que l'enregistrement n'avait pas fonctionné.
 *
 * Raccourcir le délai n'aurait fait que réduire la fenêtre. On purge donc au
 * moment où la modification a lieu, ce qui rend le changement immédiat tout en
 * gardant une page d'accueil servie depuis le cache le reste du temps.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  )

  const { data } = await supabase.auth.getUser()
  if (data.user?.id !== ADMIN_UUID) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  // L'accueil et le catalogue montrent tous deux des prix et des visuels. Les
  // fiches produit sont rendues à la demande et n'ont rien à purger.
  revalidatePath('/')
  revalidatePath('/products')

  return NextResponse.json({ ok: true })
}
