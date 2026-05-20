import { HomesickPageImpl } from '../../_homesick-shared'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import type { Lang } from '@/lib/lang'

interface Props {
  params: Promise<{ lang: string }>
}

// Alias route for /homesick — canonical SEO points to the homesick URL (not nostalgia)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const siteUrl = getSiteUrl()
  return {
    alternates: {
      canonical: `${siteUrl}/${lang}/homesick`,
      languages: buildHreflang(siteUrl, '/homesick'),
    },
  }
}

export default function Page() {
  return <HomesickPageImpl />
}
