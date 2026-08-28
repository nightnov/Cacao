import type { Metadata, Viewport } from 'next'
import { Play, Inter } from 'next/font/google'
import './globals.css'
import { getTheme } from '@/lib/theme.server'
import { buildThemeStyle } from '@/lib/theme'

// Play : display anguleuse pour les titres et les prix.
// Inter : texte courant. Deux graisses par famille seulement, pour limiter
// le poids téléchargé sur les connexions mobiles.
const play = Play({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-play',
  weight: ['400', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CACAO | Ordinateurs et accessoires en Côte d\'Ivoire',
  description:
    'Achetez vos PC portables, PC bureau, écrans et accessoires informatiques en Côte d\'Ivoire. Paiement Wave, Orange Money, MTN Money, Moov Money ou carte bancaire. Livraison suivie en moins de 5 jours.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'CACAO | Ordinateurs et accessoires en Côte d\'Ivoire',
    description:
      'PC portables, PC bureau, écrans et accessoires. Paiement mobile money sécurisé, livraison suivie partout en Côte d\'Ivoire.',
    locale: 'fr_CI',
    type: 'website',
  },
}

// La couleur de la barre du navigateur sur mobile suit le thème : sinon un
// habillage de Noël s'arrêterait net au bord de la page.
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme()
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: theme.tokens.bg || '#222427',
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = await getTheme()

  // Les variables posées ici écrasent celles de globals.css. L'objet est vide
  // quand le thème actif est « Nuit » : rien à écraser dans ce cas.
  const themeStyle = buildThemeStyle(theme.tokens)

  return (
    <html
      lang="fr"
      className="dark"
      data-theme={theme.slug}
      style={themeStyle as React.CSSProperties}
    >
      <body className={`${play.variable} ${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
