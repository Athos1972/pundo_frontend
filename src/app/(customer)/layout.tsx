import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { SplashScreen } from '@/components/ui/SplashScreen'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-heading' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Pundo — Lokale Produkte finden',
  description: 'Finde Produkte in Shops in deiner Nähe in Larnaca, Zypern',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#D4622A',
  width: 'device-width',
  initialScale: 1,
  // Kein maximumScale — würde Pinch-Zoom blockieren (WCAG 1.4.4)
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir}>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}
