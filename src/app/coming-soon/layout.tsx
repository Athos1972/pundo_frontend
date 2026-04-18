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
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="antialiased bg-bg text-text">
        {children}
      </body>
    </html>
  )
}
