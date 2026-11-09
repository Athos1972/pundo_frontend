import type { Metadata } from 'next'
import { ConfirmPrivacyRequest } from '@/components/privacy/ConfirmPrivacyRequest'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function ConfirmPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <ConfirmPrivacyRequest lang={lang} />
}
