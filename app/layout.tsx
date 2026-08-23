import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Une seule famille chargée : moins de requêtes et un LCP plus rapide sur mobile.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'CACAO | Ordinateurs et accessoires en Côte d\'Ivoire',
  description:
    'Achetez vos PC portables, PC bureau et accessoires informatiques en Côte d\'Ivoire. Paiement sécurisé Wave, Orange Money, MTN Money, Moov Money ou carte bancaire. Livraison suivie à Abidjan et en région.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'CACAO | Ordinateurs et accessoires en Côte d\'Ivoire',
    description:
      'PC portables, PC bureau et accessoires. Paiement mobile money sécurisé, livraison suivie partout en Côte d\'Ivoire.',
    locale: 'fr_CI',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${jakarta.variable} font-sans`}>{children}</body>
    </html>
  )
}
