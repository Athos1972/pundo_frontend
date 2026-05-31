import type { Metadata, Viewport } from 'next'
import { headers, cookies } from 'next/headers'
import { Space_Grotesk, DM_Sans, Unbounded, Golos_Text } from 'next/font/google'
import Script from 'next/script'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { getCustomerSession } from '@/lib/customer-api'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { DirSync } from '@/components/layout/DirSync'
import { getBrandFromHeaders, buildThemeCss } from '@/config/brands'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { SpottedGlobalButton } from '@/components/spotted/SpottedGlobalButton'
import { FavoritesProvider } from '@/components/favorites/FavoritesProvider'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { HomesickAndBar } from '@/components/layout/HomesickAndBar'
import { LanguagePickerOverlay } from '@/components/ui/LanguagePickerOverlay'
import { ConsentProvider } from '@/components/consent/ConsentContext'
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner'
import { MetaPixel } from '@/components/consent/MetaPixel'
import { parseConsentCookie, CONSENT_COOKIE } from '@/lib/consent'

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

  // T8: Build a complete OG block for brand defaults (AC-40)
  const og = buildCompleteOpenGraph({
    title: brand.meta.title,
    description: brand.meta.description,
    url: brand.meta.siteUrl,
    type: 'website',
    locale: 'en',
    siteName: brand.name,
    image: {
      url: brand.assets.ogImage.startsWith('http')
        ? brand.assets.ogImage
        : `${brand.meta.siteUrl}${brand.assets.ogImage}`,
      width: 1200,
      height: 630,
      alt: brand.name,
    },
  })

  return {
    metadataBase: new URL(brand.meta.siteUrl),
    title: {
      default: brand.meta.title,
      template: `%s | ${brand.name}`,
    },
    description: brand.meta.description,
    manifest: '/manifest.webmanifest',
    openGraph: og.openGraph,
    twitter: og.twitter,
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
  const [lang, brand, headerStore, cookieStore] = await Promise.all([
    getLangServer(),
    getBrandFromHeaders(),
    headers(),
    cookies(),
  ])
  const dir = isRTL(lang) ? 'rtl' : 'ltr'
  const session = await getCustomerSession(lang)
  const nonce = headerStore.get('x-nonce') ?? undefined
  const themeCss = buildThemeCss(brand)
  const initialConsent = parseConsentCookie(cookieStore.get(CONSENT_COOKIE)?.value)

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
              src={
                brand.analytics.plausibleScriptSrc ??
                `${brand.analytics.plausibleHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`
              }
              strategy="afterInteractive"
              nonce={nonce}
            />
            <Script
              id="plausible-queue"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};window.plausible.init=window.plausible.init||function(i){window.plausible.o=i||{}};window.plausible.init()`,
              }}
            />
          </>
        )}
        <ConsentProvider initialConsent={initialConsent}>
          <DirSync fallbackLang={lang} />
          <SplashScreen splashSvg={brand.assets.splashSvg} />
          <LanguagePickerOverlay serverLang={lang} />
          <TooltipProvider>
            <SessionProvider initialSession={session}>
              <FavoritesProvider>
                <Header lang={lang} />
                {children}
                <Footer lang={lang} />
                <SpottedGlobalButton lang={lang} brandSlug={brand.slug} />
                <HomesickAndBar lang={lang} brandSlug={brand.slug} recentlyViewed={brand.features.recentlyViewed} />
              </FavoritesProvider>
            </SessionProvider>
          </TooltipProvider>
          <CookieConsentBanner lang={lang} />
          {brand.analytics.metaPixelId && (
            <MetaPixel pixelId={brand.analytics.metaPixelId} nonce={nonce} />
          )}
        </ConsentProvider>
      </body>
    </html>
  )
}
