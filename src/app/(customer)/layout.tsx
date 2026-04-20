import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Space_Grotesk, DM_Sans, Unbounded, Golos_Text } from 'next/font/google'
import Script from 'next/script'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { getCustomerSession } from '@/lib/customer-api'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { getBrandFromHeaders, buildThemeCss } from '@/config/brands'
import { SpottedGlobalButton } from '@/components/spotted/SpottedGlobalButton'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
})
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700'],
  variable: '--font-unbounded',
})
const golosText = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  variable: '--font-golos-text',
})

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandFromHeaders()
  return {
    metadataBase: new URL(brand.meta.siteUrl),
    title: {
      default: brand.meta.title,
      template: `%s | ${brand.name}`,
    },
    description: brand.meta.description,
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      siteName: brand.name,
      title: brand.meta.title,
      description: brand.meta.description,
      images: [{ url: brand.assets.ogImage, width: 512, height: 512, alt: brand.name }],
    },
    twitter: {
      card: 'summary',
      title: brand.meta.title,
      description: brand.meta.description,
      images: [brand.assets.ogImage],
    },
  }
}

export const viewport: Viewport = {
  // themeColor bleibt statisch — Pundo-Orange als sicherer Default.
  // Per-Brand-Farbe kommt via CSS-Variablen-Injection.
  themeColor: '#D4622A',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, brand, headerStore] = await Promise.all([
    getLangServer(),
    getBrandFromHeaders(),
    headers(),
  ])
  const dir = isRTL(lang) ? 'rtl' : 'ltr'
  const session = await getCustomerSession(lang)
  const nonce = headerStore.get('x-nonce') ?? undefined
  const themeCss = buildThemeCss(brand)

  return (
    <html lang={lang} dir={dir}>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: themeCss }} suppressHydrationWarning />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} ${unbounded.variable} ${golosText.variable} antialiased`}>
        {brand.analytics.plausibleDomain && (
          <>
            <Script
              id="plausible-tracker"
              defer
              data-domain={brand.analytics.plausibleDomain}
              src={`${brand.analytics.plausibleHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`}
              strategy="afterInteractive"
              nonce={nonce}
            />
            <Script
              id="plausible-queue"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`,
              }}
            />
          </>
        )}
        <SplashScreen splashSvg={brand.assets.splashSvg} />
        <SessionProvider initialSession={session}>
          <Header />
          {children}
          <Footer />
          <SpottedGlobalButton lang={lang} />
        </SessionProvider>
      </body>
    </html>
  )
}
