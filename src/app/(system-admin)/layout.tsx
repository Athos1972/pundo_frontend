import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { DM_Sans } from 'next/font/google'
import '../globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'System Admin',
  description: 'System Administration',
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
}

export default async function SystemAdminRootLayout({ children }: { children: React.ReactNode }) {
  // Reading x-nonce opts this layout into dynamic rendering. Next.js then reads
  // x-nonce from the request headers and applies it to all inline scripts it
  // generates (bootstrap, RSC payload). Without this call the layout is
  // statically rendered — no per-request nonce is available and the nonce-based
  // CSP set by proxy.ts blocks every inline script, preventing React from booting.
  await headers()

  return (
    <html lang="en" dir="ltr">
      <body className={`${dmSans.variable} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
