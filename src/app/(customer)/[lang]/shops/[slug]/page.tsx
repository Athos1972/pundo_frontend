// Shop-Detailseite zeigt Live-Daten (Öffnungszeiten, website_url, Angebote).
// force-dynamic verhindert Full-Route-Cache — getShop/getShopOffers haben
// bereits cache:'no-store', aber erst ab Next.js 16 propagiert das verlässlich
// zur Route-Ebene. Explizit ist sicherer.
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { getShop, searchProducts, getShopOffers, getRelatedShops, getShopCities } from '@/lib/api'
import { findCityByName } from '@/lib/shop-city-index'
import { buildShopPin, getWeekdayDescriptions, getSpecialDays } from '@/lib/shop-opening-hours'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { padShopTitle, truncateDescription } from '@/lib/seo/metadata-defaults'
import { isShopComplete, slugToDisplayName } from '@/lib/seo/shop-completeness'
import { buildCompleteOpenGraph, pickShopFallbackOgImage } from '@/lib/seo/og-defaults'
import type { ShopDetailResponse } from '@/types/api'
import { buildLocalBusinessSchema, safeJson } from '@/lib/structured-data'
import { absolutizeImageUrl } from '@/lib/seo/absolutize'
import { localePath, buildHreflang } from '@/lib/routing'
import Link from 'next/link'
import { ShopMapClient } from '@/components/map/ShopMapClient'
import { BackButton } from '@/components/ui/BackButton'
import { LanguageChips } from '@/components/ui/LanguageChips'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { PhoneIcon } from '@/components/ui/PhoneIcon'
import { GlobeIcon } from '@/components/ui/GlobeIcon'
import { buildWhatsAppUrl, getHostname } from '@/lib/utils'
import { ProductCard } from '@/components/product/ProductCard'
import { ReviewSection } from '@/components/reviews/ReviewSection'
import { CommunityFeedbackSection } from '@/components/community/CommunityFeedbackSection'
import { getCustomerSession } from '@/lib/customer-api'
import { ShopLogoImage } from '@/components/shop/ShopLogoImage'
import { RelatedShopsWidget } from '@/components/shop/RelatedShopsWidget'
import { ShopOfferCard } from '@/components/shop/ShopOfferCard'
import { TrackShopView } from '@/components/recently-viewed/TrackShopView'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PixelViewContent } from '@/components/consent/PixelViewContent'
import { PAYMENT_METHODS } from '@/lib/payment-methods'
import { CharityVoteControl } from '@/components/community/CharityVoteControl'

interface Props { params: Promise<{ lang: string; slug: string }> }

/**
 * B5900-006 — Metadata for a shop that does NOT meet the isShopComplete()
 * bar (or whose fetch failed outright). Explicit `noindex, follow` instead
 * of the previous implicit Catch-fallback that emitted no `robots` field at
 * all. `follow: true` keeps internal link-equity flowing (design AC-2 neu).
 * canonical + hreflang are still emitted so the Hreflang-Mismatch nebenbefund
 * from B5900-005 doesn't resurface for incomplete shops.
 */
function incompleteShopMetadata(
  slug: string,
  lang: Lang,
  opts?: { displayName?: string; cityHint?: string | null; categoryHint?: string | null },
): Metadata {
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${lang}/shops/${slug}`
  const displayName = opts?.displayName?.trim() || slugToDisplayName(slug)
  const cityHint = opts?.cityHint ?? null
  const categoryHint = opts?.categoryHint ?? null

  const pageTitle = padShopTitle(displayName, { city: cityHint, category: categoryHint }, lang, 'Pundo')
  const description = truncateDescription(
    tr.shop_meta_description(displayName, cityHint ?? 'Cyprus', categoryHint ?? 'local'),
    { max: 155 },
  )

  return {
    title: { absolute: pageTitle },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflang(siteUrl, `/shops/${slug}`),
    },
    robots: { index: false, follow: true },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params as { lang: Lang; slug: string }

  let shop: ShopDetailResponse
  try {
    shop = await getShop(slug, lang)
  } catch {
    // Real fetch failure (e.g. network error) — no shop data at all.
    // Explicit noindex + slug-derived title, never a crash or a generic "Shop" title.
    return incompleteShopMetadata(slug, lang)
  }

  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${lang}/shops/${slug}`
  const cityHint = shop.address_raw?.split(',').at(-1)?.trim() ?? null
  const categoryHint = shop.shop_type?.canonical ?? null
  const displayName = shop.name?.trim() || slugToDisplayName(slug)

  if (!isShopComplete(shop)) {
    // AC-2/AC-3 (neu): explicit, testable "incomplete" branch instead of an
    // accidental Catch-fallback. Shop still gets a sensible title + H1 for
    // human visitors coming via internal links (e.g. the search map).
    return incompleteShopMetadata(slug, lang, { displayName, cityHint, categoryHint })
  }

  // T6/AC-38b: Pad short shop names to reach TITLE_MIN
  const pageTitle = padShopTitle(displayName, { city: cityHint, category: categoryHint }, lang, 'Pundo')

  // T6/AC-36: Template description with shop-specific data (≥ 110 chars, ≤ 160 chars)
  const description = truncateDescription(
    tr.shop_meta_description(displayName, cityHint ?? 'Cyprus', categoryHint ?? 'local'),
    { max: 155 },
  )

  // T6/AC-40: OG image — use shop logo if available, else deterministic fallback
  // absolutizeImageUrl ensures OG-image is always an absolute URL (required by crawlers)
  const rawLogoUrl = shop.images?.[0]?.url ?? null
  const logoUrl = absolutizeImageUrl(rawLogoUrl, siteUrl)
  const ogImage = logoUrl
    ? { url: logoUrl, width: 1200 as const, height: 630 as const, alt: displayName }
    : pickShopFallbackOgImage(shop.id, siteUrl)

  const og = buildCompleteOpenGraph({
    title: pageTitle,
    description,
    url: canonicalUrl,
    type: 'website',
    locale: lang,
    siteName: 'Pundo',
    image: ogImage,
  })

  return {
    title: { absolute: pageTitle },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflang(siteUrl, `/shops/${slug}`),
    },
    robots: { index: true, follow: true },
    openGraph: og.openGraph,
    twitter: og.twitter,
    ...(og.other ? { other: og.other } : {}),
  }
}

export default async function ShopPage({ params }: Props) {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const tr = t(lang)
  const siteUrl = getSiteUrl()

  let shop
  try {
    shop = await getShop(slug, lang)
  } catch {
    notFound()
  }

  const session = await getCustomerSession(lang)

  const [topProductsResult, offers, relatedShops, charityVotesResult] = await Promise.all([
    // T4/B5900-003: Gate removed — always fetch products (limit 12, BE-3 fix required for full coverage)
    searchProducts({ shop_id: shop.id, limit: 12 }, lang).then(r => r.items),
    getShopOffers(slug, lang),
    getRelatedShops(slug, lang),
    // F3800 Phase 2 — fetch charity vote aggregate for CharityVoteControl
    shop.is_charity_supporter === true
      ? fetch(
          `${process.env.BACKEND_URL ?? 'http://localhost:8500'}/api/v1/shops/${shop.id}/votes`,
          { headers: { 'Accept-Language': lang }, cache: 'no-store' }
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
  ])
  const topProducts = topProductsResult

  // Extract charity vote aggregate from the votes response
  const charityAggregate = (charityVotesResult as { aggregates?: { attribute_type: string; vote_count: number; my_value: number | null }[] } | null)
    ?.aggregates?.find((a) => a.attribute_type === 'charity') ?? null

  const weekdayLines = getWeekdayDescriptions(shop.opening_hours_raw)
  const specialDays = getSpecialDays(shop.opening_hours_raw)

  // B5900-007/T8: prefer the discrete `shop.city` field (backend column) over
  // the previous address-string heuristic. Falls back to the heuristic only
  // when `city` is not set (older data / online-only shops).
  const cityHint = shop.city?.trim() || shop.address_raw?.split(',').at(-1)?.trim() || null

  // B5900-007/T8 — resolve the city-index slug for the breadcrumb rücklink.
  // Looked up against GET /shops/cities (same source as the city hub pages)
  // rather than re-implementing the backend's slugify()/alias logic here —
  // guarantees the breadcrumb link never points at a 404. Cities below the
  // indexing threshold (or unmatched casing) simply render without a link.
  let cityBreadcrumbHref: string | null = null
  if (cityHint) {
    try {
      const { cities } = await getShopCities(lang)
      const match = findCityByName(cities, cityHint)
      if (match) cityBreadcrumbHref = localePath(lang, `/shops/city/${match.slug}`)
    } catch {
      cityBreadcrumbHref = null
    }
  }

  // B5900-006/AC-3 (neu): never render an empty <h1> / placeholder title —
  // falls back to a slug-derived display name when `name` is missing/blank.
  const displayName = shop.name?.trim() || slugToDisplayName(slug)
  const pins = buildShopPin({ ...shop, name: displayName })

  return (
    <main className="min-h-screen bg-bg">
      <PixelViewContent contentName={displayName} contentId={slug} contentType="shop" />
      <TrackShopView
        shop={{
          id: shop.id,
          slug: slug,
          name: displayName,
          image_url: shop.images?.[0]?.url ?? null,
          city: cityHint,
        }}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <BackButton />
        <Breadcrumb items={[
          { label: tr.home, href: localePath(lang, '/') },
          { label: tr.nav_shops, href: localePath(lang, '/shops') },
          ...(cityHint
            ? [{ label: tr.shops_city_breadcrumb(cityHint), ...(cityBreadcrumbHref ? { href: cityBreadcrumbHref } : {}) }]
            : []),
          { label: displayName },
        ]} />
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <ShopLogoImage
              url={shop.images?.[0]?.url ?? null}
              name={displayName}
              size="lg"
              shopId={shop.id}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-text font-heading">{displayName}</h1>
            </div>
          </div>
          {shop.address_raw && <p className="text-text-muted mt-1">{shop.address_raw}</p>}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {shop.whatsapp_number && (
              <a
                href={buildWhatsAppUrl(
                  shop.whatsapp_number,
                  tr.whatsapp_message_shop(displayName, new URL(siteUrl).hostname)
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#128C7E] hover:opacity-80"
              >
                <WhatsAppIcon size={16} />
                {tr.whatsapp_contact}
              </a>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 text-sm text-accent hover:opacity-80">
                <PhoneIcon size={15} />
                {shop.phone}
              </a>
            )}
            {shop.website && getHostname(shop.website) && (
              <a
                href={shop.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:opacity-80"
              >
                <GlobeIcon size={15} />
                {getHostname(shop.website)}
              </a>
            )}
          </div>
          {shop.spoken_languages && shop.spoken_languages.length > 0 && (
            <div className="mt-3">
              <LanguageChips languages={shop.spoken_languages} label={tr.spoken_languages} lang={lang} />
            </div>
          )}

          {/* F5300 — Service radius / island-wide (AC-02, AC-05) */}
          {(shop.delivers_island_wide === true || (shop.service_radius_km != null && shop.service_radius_km > 0)) && (
            <p className="text-sm text-text-muted mt-2 rtl:text-right">
              📍 {shop.delivers_island_wide ? tr.shop_delivers_island_wide : tr.shop_delivers_radius(shop.service_radius_km!)}
            </p>
          )}

          {/* F3800 Phase 1a — Appointment required (AC-11, AC-12) */}
          {shop.appointment_required === true && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-2 font-medium rtl:text-right">
              📅 {tr.shop_appointment_required}
            </p>
          )}

          {/* F3800 Phase 1a — Charity badge + note (AC-08) */}
          {shop.is_charity_supporter === true && (
            <div className="mt-2 flex flex-col gap-1 rtl:items-end">
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full font-medium self-start">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {tr.charity_badge_label}
              </span>
              {/* charity_note only present on detail endpoint (approved only) */}
              {(shop as { charity_note?: string | null }).charity_note && (
                <p className="text-sm text-text-muted">
                  {(shop as { charity_note?: string | null }).charity_note}
                </p>
              )}
              {/* F3800 Phase 2 — Community voting control (AC-01..AC-04) */}
              <CharityVoteControl
                shopId={shop.id}
                lang={lang}
                initialVoteCount={charityAggregate?.vote_count ?? 0}
                initialMyValue={charityAggregate?.my_value ?? null}
                isAuthenticated={session?.is_authenticated ?? false}
              />
            </div>
          )}

          {/* F5300 — Payment methods (AC-14, AC-15) */}
          {shop.payment_methods && shop.payment_methods.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-1.5 font-medium">{tr.payment_methods_heading}</p>
              <div className="flex flex-wrap gap-2 rtl:flex-row-reverse">
                {PAYMENT_METHODS
                  .filter(def => shop.payment_methods!.includes(def.value))
                  .map(def => (
                    <span
                      key={def.value}
                      className="inline-flex items-center gap-1.5 text-xs bg-surface-alt border border-border text-text-muted px-2.5 py-1 rounded-full"
                    >
                      <def.Icon className="w-3.5 h-3.5" />
                      {tr[def.labelKey as keyof typeof tr] as string ?? def.labelKey}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Shop description */}
        {shop.description && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h2 className="font-bold text-sm text-text mb-2 font-heading">
              {tr.shop_about_heading}
            </h2>
            <p className="text-sm text-text-muted whitespace-pre-line">
              {shop.description}
            </p>
          </div>
        )}

        {/* Map — isolate creates a new stacking context so Leaflet's z-indices don't bleed above FABs */}
        {pins.length > 0 && (
          <div className="isolate">
            <ShopMapClient shops={pins} className="w-full h-48 rounded-xl overflow-hidden" lang={lang} zoom={17} />
          </div>
        )}

        {/* Opening hours */}
        {(shop.opening_hours_raw || shop.opening_hours) && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h2 className="font-bold text-sm text-text mb-3 font-heading">{tr.opening_hours}</h2>
            {weekdayLines.length > 0 ? (
              <ul className="space-y-1">
                {weekdayLines.map((line, i) => (
                  <li key={i} className="text-sm text-text">{line}</li>
                ))}
              </ul>
            ) : shop.opening_hours ? (
              <div className="space-y-1">
                {(['mon','tue','wed','thu','fri','sat','sun'] as const).map((dayKey, idx) => {
                  // OpeningHoursEditor saves with numeric keys '0'-'6' (Mon-Sun)
                  const numKey = String(idx)
                  const oh = shop.opening_hours!
                  const hours = (numKey in oh ? oh[numKey] : oh[dayKey]) as
                    { open?: string; close?: string; closed?: boolean } | null | undefined
                  if (hours === undefined) return null
                  const isClosed = !hours || (hours as { closed?: boolean }).closed === true
                  return (
                    <div key={dayKey} className="flex justify-between text-sm">
                      <span className="text-text-muted">{tr.days[dayKey]}</span>
                      <span className={isClosed ? 'text-text-light' : 'text-text'}>
                        {isClosed ? tr.closed : `${hours!.open} – ${hours!.close}`}
                      </span>
                    </div>
                  )
                }).filter(Boolean)}
                {'ph' in shop.opening_hours && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{tr.days['ph']}</span>
                    <span className="text-text-light">{tr.closed}</span>
                  </div>
                )}
              </div>
            ) : null}
            {specialDays.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-text-muted mb-1">Sonderöffnungszeiten</p>
                <ul className="space-y-1">
                  {specialDays.map((day, i) => (
                    <li key={i} className="text-xs text-text-muted flex justify-between">
                      <span>{day.date}</span>
                      <span>{day.isOpen && day.openingHours ? `${day.openingHours.open} – ${day.openingHours.close}` : tr.closed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Active shop offers — only offers with currently active promotion */}
        {offers.length > 0 && (
          <div>
            <h2 className="font-bold text-sm text-text font-heading mb-3">{tr.shop_offers}</h2>
            <div className="space-y-2">
              {offers.map(offer => (
                <ShopOfferCard key={offer.id} offer={offer} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* Top products */}
        {topProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-text font-heading">{tr.products}</h2>
              <Link href={localePath(lang, `/search?shop_id=${shop.id}`)} className="text-xs text-accent hover:underline">
                {tr.filter_all} →
              </Link>
            </div>
            <div className="space-y-2">
              {topProducts.map(p => (
                <ProductCard key={p.id} item={p} lang={lang} variant="horizontal" />
              ))}
            </div>
          </div>
        )}

        {/* Related Shops */}
        <RelatedShopsWidget items={relatedShops.items} lang={lang} />

        {/* Community Feedback */}
        <CommunityFeedbackSection
          shopId={shop.id}
          shopTypeCanonical={shop.shop_type?.canonical ?? null}
          isAuthenticated={session.is_authenticated}
          lang={lang}
        />

        {/* Reviews */}
        <ReviewSection entityType="shop" entityId={shop.id} lang={lang} tr={tr} isAuthenticated={session.is_authenticated} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(buildLocalBusinessSchema(shop, siteUrl)) }}
      />
    </main>
  )
}
