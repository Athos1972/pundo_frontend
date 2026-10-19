// Minimal root layout for public CRM pages (opt-out link from outreach mails) —
// no navbar, no footer, no lang prefix. Next 16.4 requires every page to sit
// under a root layout; crm/ lives outside the route groups that provide one.
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Pundo',
  robots: { index: false, follow: false },
}

// B7600-001: the strict CSP (src/proxy.ts) only allows scripts that carry the per-request nonce. A statically
// prerendered page has none, so React never hydrated and the opt-out button did nothing. Reading headers() makes
// every page below this layout dynamic, Next then stamps the nonce on its scripts (same pattern as the other root layouts).
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  await headers()
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
