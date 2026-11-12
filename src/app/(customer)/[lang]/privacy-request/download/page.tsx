import type { Metadata } from 'next'
import { DownloadPrivacyExport } from '@/components/privacy/DownloadPrivacyExport'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function DownloadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <DownloadPrivacyExport lang={lang} />
}
