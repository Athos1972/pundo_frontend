import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { getCustomerSession } from '@/lib/customer-api'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { getSiteUrl } from '@/lib/seo'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-heading' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-sans' })

const siteUrl = getSiteUrl()
const defaultDescription = 'Finde Produkte in Shops in deiner Nähe in Larnaca, Zypern'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pundo — Lokale Produkte finden',
    template: '%s | Pundo',
  },
  description: defaultDescription,
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'Pundo',
    title: 'Pundo — Lokale Produkte finden',
    description: defaultDescription,
    images: [{ url: '/pundo-logo.png', width: 512, height: 512, alt: 'Pundo' }],
  },
  twitter: {
    card: 'summary',
    title: 'Pundo — Lokale Produkte finden',
    description: defaultDescription,
    images: ['/pundo-logo.png'],
  },
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
  const session = await getCustomerSession(lang)

  return (
    <html lang={lang} dir={dir}>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <>
            {/* Plausible Analytics — self-hosted auf plausible.pundo.cy. */}
            {/* Full-featured build: file-downloads, hash (SPA-Routing), */}
            {/* outbound-links, pageview-props, revenue, tagged-events. */}
            <Script
              id="plausible-tracker"
              defer
              data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
              src="https://plausible.pundo.cy/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js"
              strategy="afterInteractive"
            />
            {/* Queue helper: erlaubt plausible('Event', ...) Aufrufe bevor */}
            {/* der Tracker geladen hat — Events werden dann asynchron abgesetzt */}
            {/* sobald die Tracker-Datei da ist. */}
            <Script
              id="plausible-queue"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`,
              }}
            />
          </>
        )}
        <SplashScreen />
        <SessionProvider initialSession={session}>
          <Header />
          {children}
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}
