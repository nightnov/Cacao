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
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#222427',
        'bg-panel': '#1C2021',
        'bg-sunken': '#171A1C',
        'bg-raised': '#2A2D31',
        ink: '#EEF2F7',
        'ink-dim': '#B3B8BE',
        'ink-dimmer': '#8E959D',
        'ink-invert': '#1A1A1A',
        border: '#35383C',
        'border-strong': '#4E5257',
        gold: '#FDC700',
        'gold-dim': '#E0B000',
        green: '#00A63E',
        'green-bright': '#3FCE7A',
        info: '#3CA4FF',
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
