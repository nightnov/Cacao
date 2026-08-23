import type { Config } from 'tailwindcss'

/**
 * Palette « Cacao + Braise ».
 *
 * Le nom de la marque et le pays (premier producteur mondial de cacao) justifient
 * une famille chaude, mais la toile reste quasi-blanche pour que les produits
 * dominent l'écran au lieu de se noyer dans un fond crème.
 *
 * Contrastes vérifiés sur fond blanc (WCAG 2.1) :
 *   ember   #C2410C  5.18:1  (AA texte normal)   — remplace #FF6600 qui échouait à 2.94:1
 *   ink     #241A14 17.02:1  (AAA)
 *   ink-dim #5B4B41  8.31:1  (AAA)
 *   muted   #7D6A5D  5.13:1  (AA)                — remplace #8A8579 qui échouait à 3.68:1
 *   green   #1E7A46  5.35:1  (AA)
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F4',
        'bg-card': '#FFFFFF',
        orange: '#C2410C',
        'orange-hover': '#9A3412',
        ink: '#241A14',
        'ink-dim': '#5B4B41',
        'ink-dimmer': '#7D6A5D',
        border: '#E8E0D8',
        green: '#1E7A46',
        cream: '#F3EDE6',
        'cacao-brown': '#2E1D14',
      },
      fontFamily: {
        // Une seule famille sur tout le site : moins de fichiers à télécharger,
        // ce qui compte sur les connexions mobiles ivoiriennes. `serif` est
        // conservé comme alias car ~100 composants l'utilisent pour les titres.
        serif: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
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
        '5xl': '46px',
      },
      boxShadow: {
        // Ombres teintées cacao plutôt que noir pur (le noir pur salit les fonds chauds)
        card: '0 1px 2px rgba(36, 26, 20, 0.04), 0 4px 12px rgba(36, 26, 20, 0.06)',
        'card-hover': '0 2px 4px rgba(36, 26, 20, 0.06), 0 12px 28px rgba(36, 26, 20, 0.10)',
      },
    },
  },
  plugins: [],
}
export default config
