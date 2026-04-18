import type { Metadata } from 'next'
import { getLangServer, isRTL } from '@/lib/lang'
import { getBrandFromHeaders, buildThemeCss } from '@/config/brands'
import '../globals.css'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Noto+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="antialiased bg-bg text-text">
        {children}
      </body>
    </html>
  )
}
