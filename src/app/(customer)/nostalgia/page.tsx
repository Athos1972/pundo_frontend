import { HomesickPageImpl } from '../_homesick-shared'
import type { Metadata } from 'next'

// Alias route for /homesick — canonical SEO points to /homesick
export const metadata: Metadata = {
  alternates: { canonical: '/homesick' },
}

export default function Page() {
  return <HomesickPageImpl />
}
