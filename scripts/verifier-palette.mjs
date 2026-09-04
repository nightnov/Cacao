import fs from 'node:fs'

const css = fs.readFileSync('app/globals.css', 'utf8')
const ts = fs.readFileSync('lib/theme.ts', 'utf8')

const start = css.indexOf(':root {')
const root = css.slice(start, css.indexOf('\n}', start))

const block = ts.slice(ts.indexOf('DEFAULT_TOKENS'), ts.indexOf('const HEX'))

let bad = 0
let n = 0
for (const m of block.matchAll(/'?([a-z-]+)'?:\s*'(#[0-9A-Fa-f]{6})'/g)) {
  const [, key, hex] = m
  n++
  const rm = root.match(new RegExp(`--c-${key}:\\s*(\\d+) (\\d+) (\\d+)`))
  if (!rm) {
    console.log('MANQUE dans globals.css :', key)
    bad++
    continue
  }
  const cssHex =
    '#' + [rm[1], rm[2], rm[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase()
  if (cssHex !== hex.toUpperCase()) {
    console.log(`ECART ${key} : theme.ts=${hex} globals.css=${cssHex}`)
    bad++
  }
}
console.log(`${n} couleurs comparees, ${bad} ecart(s)`)
