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
      /**
       * Ombres volontairement à peine perceptibles.
       *
       * Sur un fond sombre, une ombre noire ne crée pas de relief : elle
       * creuse un halo plus noir que le fond, qui se lit comme une salissure.
       * Les valeurs précédentes (jusqu'à 40 % d'opacité sur 36 px) alourdissaient
       * chaque carte. La profondeur vient désormais de la bordure et de l'écart
       * de teinte entre le fond et le panneau ; l'ombre ne fait que les asseoir.
       */
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.14)',
        'card-hover': '0 2px 4px rgba(0,0,0,.16), 0 10px 28px rgba(0,0,0,.18)',
        // En-tête figé : marque la séparation quand le contenu passe dessous,
        // sans dessiner une barre sombre en permanence.
        header: '0 1px 0 rgba(0,0,0,.2), 0 6px 20px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
}
export default config
