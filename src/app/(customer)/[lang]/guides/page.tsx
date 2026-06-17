import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getGuides, getFeaturedGuide } from '@/lib/guides'
import { FeaturedGuideHero } from '@/components/guides/FeaturedGuideHero'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { GuidesGrid } from '@/components/guides/GuidesGrid'
import { BackButton } from '@/components/ui/BackButton'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageTitle = `${tr.page_title_guides} — pundo`
  const pageUrl = `${siteUrl}/${lang}/guides`

  const { openGraph, twitter } = buildCompleteOpenGraph({
    title: pageTitle,
    description: tr.guides_index_subtitle,
    url: pageUrl,
    type: 'website',
    locale: lang,
    siteName: 'Pundo',
    image: {
      url: `${siteUrl}/og/shop-fallback-default.jpg`,
      width: 1200,
      height: 630,
      alt: 'Pundo Guides',
    },
  })

  return {
    title: pageTitle,
    description: tr.guides_index_subtitle,
    alternates: {
      canonical: pageUrl,
      languages: buildHreflang(siteUrl, '/guides'),
    },
    openGraph,
    twitter,
  }
}

export default async function GuidesIndexPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const featured = getFeaturedGuide(lang)
  const allGuides = getGuides(lang)
  const gridGuides = featured
    ? allGuides.filter((g) => g.slug !== featured.slug)
    : allGuides

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
    haustiere: tr.category_haustiere,
    gesundheit: tr.category_gesundheit,
    wohnen: tr.category_wohnen,
    finanzen: tr.category_finanzen,
    plattform: tr.category_plattform,
    start: tr.category_start,
    gemeinschaft: tr.category_gemeinschaft,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">{tr.guides_index_title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{tr.guides_index_subtitle}</p>
      </div>
      {featured?.hero_alt && (
        <FeaturedGuideHero
          guide={featured}
          lang={lang}
          badgeLabel={tr.guides_featured_badge}
          ctaLabel={tr.guides_featured_cta}
        />
      )}
      <GuidesGrid
        guides={gridGuides}
        filterAll={tr.guides_filter_all}
        categoryLabels={categoryLabels}
        readtimeLabels={Object.fromEntries(
          [...new Set(allGuides.map((g) => g.readtime))].map((rt) => [rt, tr.guide_readtime(Number(rt))])
        )}
        lang={lang}
      />
    </main>
  )
}
