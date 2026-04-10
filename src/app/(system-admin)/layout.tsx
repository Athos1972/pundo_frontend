import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import '../globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Pundo System Admin',
  description: 'Pundo System Administration',
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
}

export default function SystemAdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${dmSans.variable} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
