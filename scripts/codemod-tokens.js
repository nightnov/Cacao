/*
 * Remplace les couleurs écrites en dur (`bg-[#FDC700]`) par les tokens Tailwind
 * adossés aux variables CSS (`bg-gold`). Sans ça, changer de thème depuis
 * l'administration n'aurait aucun effet : les valeurs sont figées à la
 * compilation.
 *
 * L'administration (app/admin) est volontairement exclue : elle a sa propre
 * palette claire et n'a pas à suivre les couleurs saisonnières de la boutique.
 *
 * Usage : node scripts/codemod-tokens.js [--dry]
 */
const fs = require('fs')
const path = require('path')

const MAP = {
  '222427': 'bg',
  '1C2021': 'bg-panel',
  '171A1C': 'bg-sunken',
  '2A2D31': 'bg-raised',
  EEF2F7: 'ink',
  B3B8BE: 'ink-dim',
  '8E959D': 'ink-dimmer',
  '6F767E': 'ink-faint',
  '1A1A1A': 'ink-invert',
  '35383C': 'border',
  '3E4247': 'border-mid',
  '3A3E42': 'border-mid',
  '4E5257': 'border-strong',
  FDC700: 'gold',
  E0B000: 'gold-dim',
  '00A63E': 'green',
  '3FCE7A': 'green-bright',
  '3CA4FF': 'info',
  F87171: 'danger',

  // Teintes ponctuelles choisies à la main, ramenées sur un token pour qu'elles
  // suivent le thème. Ce sont des nuances dorées ou des gris voisins d'un token
  // existant : l'écart visuel est imperceptible, mais elles cessent d'être figées.
  '2A2418': 'gold/5', // fond doré très dilué (encadrés, onglet actif)
  '2A2118': 'gold/5', // même teinte, en fin de dégradé
  '4A4126': 'gold/25', // bordure dorée diluée
  '2E3236': 'border',
  '45484C': 'border-strong',

  // Reste du thème clair : un survol presque blanc sur une page sombre.
  FFF9F3: 'bg-raised',
}

const dry = process.argv.includes('--dry')
const roots = ['app', 'components']
const files = []

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    // L'admin garde sa palette claire propre.
    if (e.isDirectory()) {
      if (e.name !== 'admin' && e.name !== 'node_modules') walk(p)
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      files.push(p)
    }
  }
}
roots.forEach(walk)

let changed = 0
const leftovers = []

for (const f of files) {
  const before = fs.readFileSync(f, 'utf8')
  const after = before.replace(/\[#([0-9A-Fa-f]{6})\]/g, (whole, hex) => {
    const token = MAP[hex.toUpperCase()]
    if (!token) {
      leftovers.push(`${f}  ${whole}`)
      return whole
    }
    return token
  })
  if (after !== before) {
    changed++
    if (!dry) fs.writeFileSync(f, after, 'utf8')
  }
}

console.log(`${files.length} fichiers examinés, ${changed} modifiés${dry ? ' (simulation)' : ''}`)
if (leftovers.length) {
  console.log(`\nCouleurs non mappées (${leftovers.length}) — à traiter à la main :`)
  const counts = {}
  for (const l of leftovers) counts[l] = (counts[l] || 0) + 1
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${v}x  ${k}`))
}
