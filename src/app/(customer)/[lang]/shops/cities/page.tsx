// B5900-007 — Städte-Übersicht: verlinkt jede Stadt-Seite, damit diese selbst
// keine neuen Orphans werden (R2), und wird von /shops aus verlinkt (T7),
// womit der Crawl-Pfad ab Home geschlossen ist.
export const revalidate = 86400

import type { Metadata } from 'next'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang, localePath } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { getShopCities } from '@/lib/api'
import { BackButton } from '@/components/ui/BackButton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/${lang}/shops/cities`
  const title = tr.shops_cities_title
  const description = tr.shops_cities_meta_description

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
      languages: buildHreflang(siteUrl, '/shops/cities'),
    },
    robots: { index: true, follow: true },
    openGraph,
    twitter,
  }
}

export default async function ShopCitiesPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)

  let cities: { city: string; slug: string; shop_count: number }[] = []
  try {
    const res = await getShopCities(lang)
    cities = res.cities
  } catch {
    // Backend unreachable — render an empty (but valid) page rather than crash
    cities = []
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <BackButton />
      <Breadcrumb items={[
        { label: tr.home, href: localePath(lang, '/') },
        { label: tr.nav_shops, href: localePath(lang, '/shops') },
        { label: tr.shops_cities_h1 },
      ]} />
      <h1 className="text-2xl font-bold">{tr.shops_cities_h1}</h1>

      {cities.length === 0 ? (
        <p className="text-text-muted">{tr.shops_cities_empty}</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={localePath(lang, `/shops/city/${c.slug}`)}
                className="block bg-surface border border-border rounded-xl px-4 py-3 hover:border-accent transition-colors"
              >
                <p className="font-semibold text-text truncate font-heading">{c.city}</p>
                <p className="text-xs text-text-muted mt-0.5">{tr.shops_city_shop_count(c.shop_count)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
