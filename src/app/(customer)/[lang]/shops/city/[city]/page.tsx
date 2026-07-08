// B5900-007 — Städte-Index-Seite: crawlbarer Verlinkungs-Hub gegen Orphan-Shop-Pages.
// SSR/RSC (kein 'use client') — jeder indexierbare Shop der Stadt bekommt ein echtes
// <a href> im initialen HTML, siehe 02-architecture.md §5.1.
export const revalidate = 86400 // 1 Tag — Shop-Bestand pro Stadt ändert sich langsam

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang, localePath } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { getShopCities, getAllShopsInCity } from '@/lib/api'
import { findCityBySlug } from '@/lib/shop-city-index'
import { BackButton } from '@/components/ui/BackButton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ShopLinkRow } from '@/components/shop/ShopLinkRow'

interface Props {
  params: Promise<{ lang: string; city: string }>
}

/**
 * Thin-content guardrail (02-architecture.md §6.1, R8): cities with very few
 * indexable shops get `noindex, follow` — links still count towards the
 * orphan fix, but Google isn't asked to index a near-empty page.
 */
const THIN_CONTENT_THRESHOLD = 3

async function resolveCity(citySlug: string): Promise<{ city: string; shopCount: number } | null> {
  const { cities } = await getShopCities('en')
  const match = findCityBySlug(cities, citySlug)
  return match ? { city: match.city, shopCount: match.shop_count } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, city: citySlug } = await params as { lang: Lang; city: string }
  const resolved = await resolveCity(citySlug)
  if (!resolved) {
    // notFound() cannot be called from generateMetadata directly in all Next
    // versions with full effect — the page component itself calls notFound().
    // Here we still avoid emitting bogus indexable metadata for an unknown slug.
    return { robots: { index: false, follow: false } }
  }

  const { city, shopCount } = resolved
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/${lang}/shops/city/${citySlug}`
  const title = tr.shops_city_title(city, shopCount)
  const description = tr.shops_city_meta_description(city, shopCount)
  const isThin = shopCount < THIN_CONTENT_THRESHOLD

  const { openGraph, twitter } = buildCompleteOpenGraph({
    title,
    description,
    url: pageUrl,
    type: 'website',
    locale: lang,
    siteName: 'Pundo',
    image: {
      url: `${siteUrl}/og/shop-fallback-default.jpg`,
      width: 1200,
      height: 630,
      alt: 'Pundo',
    },
  })

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: pageUrl,
      languages: buildHreflang(siteUrl, `/shops/city/${citySlug}`),
    },
    // AC-1/AC-2: hub pages are indexable Verlinkungs-Hubs; thin ones stay
    // `follow: true` so the orphan fix still applies, but skip indexing.
    robots: isThin ? { index: false, follow: true } : { index: true, follow: true },
    openGraph,
    twitter,
  }
}

export default async function ShopCityPage({ params }: Props) {
  const { lang, city: citySlug } = await params as { lang: Lang; city: string }
  const tr = t(lang)
  const siteUrl = getSiteUrl()

  const resolved = await resolveCity(citySlug)
  if (!resolved) notFound()
  const { city } = resolved

  const shops = await getAllShopsInCity(city, lang)

  const breadcrumbJsonLdItems = [
    { label: tr.home, href: localePath(lang, '/') },
    { label: tr.nav_shops, href: localePath(lang, '/shops') },
    { label: tr.shops_city_breadcrumb(city) },
  ]

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <BackButton />
      <Breadcrumb items={breadcrumbJsonLdItems} />
      <h1 className="text-2xl font-bold">{tr.shops_city_h1(city)}</h1>

      {shops.length === 0 ? (
        <p className="text-text-muted">{tr.shops_city_empty}</p>
      ) : (
        <div className="space-y-2">
          {shops.map((shop) => (
            <ShopLinkRow key={shop.id} shop={shop} lang={lang} />
          ))}
        </div>
      )}

      <Link
        href={localePath(lang, '/shops/cities')}
        className="inline-block text-sm text-accent hover:underline"
      >
        {tr.shops_browse_by_city_link} →
      </Link>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: shops.map((shop, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${siteUrl}${localePath(lang, `/shops/${shop.slug}`)}`,
              name: shop.name ?? shop.slug,
            })),
          }),
        }}
      />
    </main>
  )
}
