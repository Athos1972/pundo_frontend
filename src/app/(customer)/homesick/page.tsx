import { HomesickPageImpl } from '../_homesick-shared'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/homesick' },
}

export default function Page() {
  return <HomesickPageImpl />
}
