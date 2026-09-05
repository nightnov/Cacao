/**
 * Vérifie ce qui est réellement présent en base, plutôt que de se fier au
 * dossier des migrations : un fichier écrit n'est pas un fichier exécuté.
 *
 * Chaque contrôle interroge la vraie table ou la vraie colonne. Une erreur
 * 42703 (colonne inconnue) ou 42P01 (table inconnue) signifie que la migration
 * n'est pas passée.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

for (const ligne of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = ligne.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const controles = [
  ['038', 'table component_glossary', () => db.from('component_glossary').select('key').limit(1)],
  ['039', 'entrees os + ports', () => db.from('component_glossary').select('key').in('key', ['os', 'ports'])],
  ['040', 'FAQ sans Yango', () => db.from('faq_items').select('question, answer')],
  ['041', 'products.item_condition', () => db.from('products').select('item_condition').limit(1)],
  ['041', 'orders.is_custom_order', () => db.from('orders').select('is_custom_order').limit(1)],
  ['043', 'orders.delivered_at', () => db.from('orders').select('delivered_at').limit(1)],
  ['043', 'table delivery_attempts', () => db.from('delivery_attempts').select('id').limit(1)],
]

for (const [num, quoi, requete] of controles) {
  const { data, error } = await requete()
  if (error) {
    console.log(`  MANQUE  ${num}  ${quoi}  ->  ${error.message}`)
    continue
  }
  if (num === '039') {
    console.log(`  ${data.length === 2 ? 'OK     ' : 'MANQUE '} ${num}  ${quoi}  (${data.length}/2)`)
  } else if (num === '040') {
    const sales = data.filter(f => /yango|par email et SMS|temps r[ée]el/i.test(f.answer))
    console.log(`  ${sales.length === 0 ? 'OK     ' : 'MANQUE '} ${num}  ${quoi}  (${sales.length} reponse(s) fausse(s))`)
    sales.forEach(f => console.log(`             > ${f.question}`))
  } else {
    console.log(`  OK      ${num}  ${quoi}`)
  }
}
