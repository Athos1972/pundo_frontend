import type { Metadata } from 'next'
import { Space_Grotesk, DM_Sans, Unbounded, Golos_Text } from 'next/font/google'
import { getLangServer, isRTL } from '@/lib/lang'
import { getBrandFromHeaders, buildThemeCss } from '@/config/brands'
import '../globals.css'

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
    title: `${brand.name} — Coming Soon`,
    description: brand.meta.description,
    icons: { icon: brand.assets.favicon },
  }
}

export default async function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  const [lang, brand] = await Promise.all([getLangServer(), getBrandFromHeaders()])
  const dir = isRTL(lang) ? 'rtl' : 'ltr'
  const themeCss = buildThemeCss(brand)

  return (
    <html lang={lang} dir={dir}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} ${unbounded.variable} ${golosText.variable} antialiased bg-bg text-text`}>
        {children}
      </body>
    </html>
  )
}
