import type { Metadata, Viewport } from 'next'
import { Play, Inter } from 'next/font/google'
import './globals.css'

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#222427',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${play.variable} ${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
