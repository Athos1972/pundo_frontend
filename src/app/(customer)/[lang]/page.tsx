import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { LANGS } from '@/lib/lang'
import { getCategories } from '@/lib/api'
import { getFeaturedCategoryIds } from '@/lib/featured-categories'
import type { CategoryItem } from '@/types/api'
import { getBrandFromHeaders } from '@/config/brands'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { buildOrganizationSchema, buildWebSiteSchema, safeJson } from '@/lib/structured-data'
import { Hero } from '@/components/layout/Hero'
import { CommunityCard } from '@/components/community/CommunityCard'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { NearbyShops } from '@/components/shop/NearbyShops'
import { HomesickTeaser } from '@/components/home/HomesickTeaser'
import { ActivityFeed } from '@/components/activity-feed/ActivityFeed'
import { RecentlyViewedList } from '@/components/recently-viewed/RecentlyViewedList'

interface Props {
  params: Promise<{ lang: string }>
}

export function generateStaticParams() {
  return LANGS.map(lang => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const siteUrl = getSiteUrl()
  const title = 'Find Local Shops, Products & Services in Cyprus — Pundo'
  // 156 chars — within DESC_MAX=160 (was 168, SEO-feedback-review-20260603 M2)
  const description = 'Find local shops, products and services in Limassol, Paphos, Larnaca and across Cyprus. Compare prices, check stock and discover nearby businesses near you.'
  // No trailing slash: Next.js trailingSlash=false (default) 308-redirects '/en/' → '/en'
  // Canonical must match the non-redirecting URL (SEO-feedback-review-20260603 M1)
  const canonicalUrl = `${siteUrl}/${lang}`
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflang(siteUrl, '/'),
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title,
      description,
      siteName: 'Pundo',
      images: [{ url: `${siteUrl}/og/shop-fallback-default.jpg`, width: 1200, height: 630, alt: 'Pundo — local price comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`${siteUrl}/og/shop-fallback-default.jpg`],
    },
    // Explicit robots directive — homepage was missing this (SEO-feedback-review-20260603 M3)
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const brand = await getBrandFromHeaders()
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const featuredIds = getFeaturedCategoryIds()
  const categoriesData = await getCategories(
    featuredIds
      ? { taxonomy_type: 'google' }
      : { taxonomy_type: 'google', only_with_products: true },
    lang
  ).catch(() => ({ items: [] }))

  let categories: CategoryItem[]
  if (featuredIds) {
    categories = featuredIds
      .map(id => categoriesData.items.find(c => c.id === id))
      .filter((c): c is CategoryItem => c !== undefined)
    const missing = featuredIds.filter(id => !categoriesData.items.some(c => c.id === id))
    if (missing.length > 0) console.warn('[featured-categories] IDs nicht im Backend:', missing)
  } else {
    categories = categoriesData.items
  }

  return (
    <div className="min-h-screen bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(buildOrganizationSchema(siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(buildWebSiteSchema(siteUrl)) }} />
      <Hero brand={brand} categories={categories} lang={lang} preserveOrder={!!featuredIds} />

      {/* F4700: Activity Feed — directly after Hero, before CommunityCard (AC-B5) */}
      <ActivityFeed brand={brand} lang={lang} />

      {brand.features.communityCard && <CommunityCard brand={brand} />}

      {brand.features.homesickTeaser && <HomesickTeaser brand={brand} lang={lang} />}

      {/* F4700: Recently Viewed — home variant (naidivse only, hides when empty) */}
      {brand.features.recentlyViewed === 'home' && (
        <section className="px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-sm font-bold text-text mb-3">
              {tr.recently_viewed_heading}
            </h2>
            <RecentlyViewedList variant="home" lang={lang} />
          </div>
        </section>
      )}

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <GuidesTeaser lang={lang} />
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="font-display text-xl font-bold text-text mb-5">
          {tr.nearby_shops}
        </h2>
        <NearbyShops lang={lang} />
      </main>
    </div>
  )
}
