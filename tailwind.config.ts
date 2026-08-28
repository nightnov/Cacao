import type { Config } from 'tailwindcss'

/**
 * Thème sombre « Nuit » — direction validée avec le client (repère : strafepc.com).
 *
 * Palette relevée sur le site de référence puis vérifiée en contraste WCAG
 * sur le fond réel `#222427` :
 *   ink      #EEF2F7  14.1:1  (AAA)
 *   ink-dim  #B3B8BE   7.7:1  (AAA)
 *   muted    #8E959D   4.6:1  (AA)
 *   gold     #FDC700   9.6:1  (AAA)
 *
 * Le doré est très clair : tout texte posé DESSUS doit être `ink-invert`
 * (#1A1A1A, 12.9:1). Du blanc sur doré tomberait à 1.6:1 et serait illisible.
 *
 * Les valeurs elles-mêmes ne vivent plus ici mais dans `app/globals.css`, sous
 * forme de variables CSS. C'est ce qui permet à l'administration de changer la
 * teinte du site (Noël, Halloween…) sans recompilation : le serveur réécrit les
 * variables, Tailwind n'a pas besoin de savoir ce qu'elles valent.
 *
 * Les variables contiennent des CANAUX (« 253 199 0 ») et non un hexadécimal,
 * pour que les modificateurs d'opacité de Tailwind (`bg-gold/10`) continuent de
 * fonctionner — avec un simple `var(--x)` contenant « #FDC700 », ils casseraient.
 */
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        'bg-panel': c('bg-panel'),
        'bg-sunken': c('bg-sunken'),
        'bg-raised': c('bg-raised'),
        ink: c('ink'),
        'ink-dim': c('ink-dim'),
        'ink-dimmer': c('ink-dimmer'),
        'ink-faint': c('ink-faint'),
        'ink-invert': c('ink-invert'),
        border: c('border'),
        'border-mid': c('border-mid'),
        'border-strong': c('border-strong'),
        gold: c('gold'),
        'gold-dim': c('gold-dim'),
        green: c('green'),
        'green-bright': c('green-bright'),
        info: c('info'),
        danger: c('danger'),
      },
      fontFamily: {
        // `serif` est conservé comme alias : ~100 composants l'utilisent pour
        // les titres. Il pointe désormais sur Play, la display du thème.
        serif: ['var(--font-play)', 'system-ui', 'sans-serif'],
        display: ['var(--font-play)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
        '5xl': '44px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.25), 0 6px 18px rgba(0,0,0,.28)',
        'card-hover': '0 2px 6px rgba(0,0,0,.3), 0 16px 36px rgba(0,0,0,.4)',
      },
    },
  },
  plugins: [],
}
export default config
