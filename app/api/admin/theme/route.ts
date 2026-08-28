import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { THEME_CACHE_TAG } from '@/lib/theme.server'
import { sanitizeTokens, TOKEN_KEYS } from '@/lib/theme'

const ADMIN_UUID = 'f4e9e8fd-8e85-4045-a6e5-c2c62204c5ff'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9-]{1,40}$/

/**
 * Enregistrement des thèmes.
 *
 * L'écriture passe par le serveur plutôt que directement par le navigateur pour
 * une seule raison : il faut purger le cache du thème juste après, sinon le
 * changement ne serait visible qu'au bout d'une heure. Le contrôle d'accès est
 * fait deux fois — ici sur l'identifiant, et par RLS sur la table.
 */
async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  )

  const { data } = await supabase.auth.getUser()
  if (data.user?.id !== ADMIN_UUID) return null
  return supabase
}

export async function POST(req: NextRequest) {
  const supabase = await requireAdmin(req)
  if (!supabase) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const { action } = body

  // ── Choisir le thème appliqué hors période programmée ────────────────────
  if (action === 'activate') {
    if (!SLUG.test(body.slug || '')) {
      return NextResponse.json({ error: 'Thème inconnu.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'active_theme', value: body.slug }, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidateTag(THEME_CACHE_TAG)
    return NextResponse.json({ ok: true })
  }

  // ── Enregistrer les couleurs et la programmation d'un thème ──────────────
  if (action === 'save') {
    if (!SLUG.test(body.slug || '')) {
      return NextResponse.json({ error: 'Identifiant de thème invalide.' }, { status: 400 })
    }

    const tokens = sanitizeTokens(body.tokens)
    const missing = TOKEN_KEYS.filter(k => !tokens[k])
    if (missing.length) {
      return NextResponse.json(
        { error: `Couleurs manquantes ou mal formées : ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const startsOn = body.starts_on || null
    const endsOn = body.ends_on || null

    // Une seule borne laisserait une période qui ne se refermerait jamais.
    if ((startsOn === null) !== (endsOn === null)) {
      return NextResponse.json(
        { error: 'Indiquez les deux dates, ou aucune des deux.' },
        { status: 400 }
      )
    }
    if (startsOn && (!DATE.test(startsOn) || !DATE.test(endsOn) || endsOn < startsOn)) {
      return NextResponse.json({ error: 'Période invalide.' }, { status: 400 })
    }

    const { error } = await supabase.from('site_themes').upsert(
      {
        slug: body.slug,
        name: String(body.name || '').slice(0, 60) || body.slug,
        tokens,
        starts_on: startsOn,
        ends_on: endsOn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidateTag(THEME_CACHE_TAG)
    return NextResponse.json({ ok: true })
  }

  // ── Supprimer un thème créé par l'utilisateur ─────────────────────────────
  if (action === 'delete') {
    if (!SLUG.test(body.slug || '')) {
      return NextResponse.json({ error: 'Thème inconnu.' }, { status: 400 })
    }

    // Les thèmes fournis restent : ils garantissent qu'il y a toujours un
    // habillage valide sur lequel retomber.
    const { data: theme } = await supabase
      .from('site_themes')
      .select('is_builtin')
      .eq('slug', body.slug)
      .maybeSingle()

    if (!theme) return NextResponse.json({ error: 'Thème introuvable.' }, { status: 404 })
    if (theme.is_builtin) {
      return NextResponse.json(
        { error: 'Les thèmes fournis ne peuvent pas être supprimés.' },
        { status: 400 }
      )
    }

    // Si le thème supprimé était le thème par défaut, revenir à Nuit — sans ça
    // le site chercherait un thème qui n'existe plus.
    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'active_theme')
      .maybeSingle()

    if (setting?.value === body.slug) {
      await supabase
        .from('site_settings')
        .upsert({ key: 'active_theme', value: 'nuit' }, { onConflict: 'key' })
    }

    const { error } = await supabase.from('site_themes').delete().eq('slug', body.slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    revalidateTag(THEME_CACHE_TAG)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
