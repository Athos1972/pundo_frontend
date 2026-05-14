import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Blog — pundo',
}

export default function BlogPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-12">
      <div id="soro-blog" />
      <Script
        src="https://app.trysoro.com/api/embed/8c458bd7-a4f3-4174-9c98-0dcf90178cc2"
        strategy="afterInteractive"
      />
    </main>
  )
}
