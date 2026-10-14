// Minimal root layout for public CRM pages (opt-out link from outreach mails) —
// no navbar, no footer, no lang prefix. Next 16.4 requires every page to sit
// under a root layout; crm/ lives outside the route groups that provide one.
import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Pundo',
  robots: { index: false, follow: false },
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
