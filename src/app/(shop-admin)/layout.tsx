import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import '../globals.css'
import { getLangServer, isRTL } from '@/lib/lang'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Pundo Shop Portal',
  description: 'Pundo Shop-Owner Portal',
}

export const viewport: Viewport = {
  themeColor: '#D4622A',
  width: 'device-width',
  initialScale: 1,
}

export default async function ShopAdminRootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangServer()
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir}>
      <body className={`${dmSans.variable} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
