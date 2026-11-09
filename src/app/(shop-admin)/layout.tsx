import type { Metadata, Viewport } from 'next'
import { headers, cookies } from 'next/headers'
import { DM_Sans } from 'next/font/google'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { getBrandFromHeaders } from '@/config/brands'
import { parseConsentCookie, CONSENT_COOKIE } from '@/lib/consent'
import { ShopAdminMetaPixel } from '@/components/shop-admin/ShopAdminMetaPixel'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Shop Portal',
  robots: { index: false, follow: false },
  description: 'Shop-Owner Portal',
}

export const viewport: Viewport = {
  themeColor: '#D4622A',
  width: 'device-width',
  initialScale: 1,
}

export default async function ShopAdminRootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const [lang, brand, cookieStore] = await Promise.all([getLangServer(), getBrandFromHeaders(), cookies()])
  const nonce = headerStore.get('x-nonce') ?? undefined
  const marketingConsent = parseConsentCookie(cookieStore.get(CONSENT_COOKIE)?.value)?.marketing === true
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir}>
      <body className={`${dmSans.variable} antialiased bg-gray-50`}>
        {children}
        {brand.analytics.metaPixelId && (
          <ShopAdminMetaPixel pixelId={brand.analytics.metaPixelId} nonce={nonce} marketingConsent={marketingConsent} />
        )}
      </body>
    </html>
  )
}
