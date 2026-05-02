// Minimal layout for OAuth consent flow — no navbar, no footer.
// Uses the same fonts and global CSS as the customer layout.
import type { Metadata } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'
import { getBrandFromHeaders, buildThemeCss } from '@/config/brands'
import { headers } from 'next/headers'

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

export const metadata: Metadata = { title: 'Connect | Pundo' }

export default async function OAuthLayout({ children }: { children: React.ReactNode }) {
  const [lang, brand, headerStore] = await Promise.all([
    getLangServer(),
    getBrandFromHeaders(),
    headers(),
  ])
  const dir = isRTL(lang) ? 'rtl' : 'ltr'
  const nonce = headerStore.get('x-nonce') ?? undefined
  const themeCss = buildThemeCss(brand)

  return (
    <html lang={lang} dir={dir}>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: themeCss }} suppressHydrationWarning />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
