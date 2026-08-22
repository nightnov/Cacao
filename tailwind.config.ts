import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FBF6EE',
        'bg-card': '#FFFFFF',
        orange: '#FF6600',
        ink: '#1A1A1A',
        'ink-dim': '#56534C',
        'ink-dimmer': '#8A8579',
        border: '#E4DDCF',
        green: '#1E7A46',
        cream: '#FBF3E7',
        'cacao-brown': '#2B1810',
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Fraunces', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
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
    },
  },
  plugins: [],
}
export default config
