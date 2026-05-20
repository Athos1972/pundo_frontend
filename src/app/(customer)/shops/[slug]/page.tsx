// Shop-Detailseite zeigt Live-Daten (Öffnungszeiten, website_url, Angebote).
// force-dynamic verhindert Full-Route-Cache — getShop/getShopOffers haben
// bereits cache:'no-store', aber erst ab Next.js 16 propagiert das verlässlich
// zur Route-Ebene. Explizit ist sicherer.
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { getShop, searchProducts, getShopOffers, getRelatedShops } from '@/lib/api'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { padShopTitle, truncateDescription } from '@/lib/seo/metadata-defaults'
import { buildCompleteOpenGraph, pickShopFallbackOgImage } from '@/lib/seo/og-defaults'
import { buildLocalBusinessSchema, safeJson } from '@/lib/structured-data'
import { absolutizeImageUrl } from '@/lib/seo/absolutize'
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
import { TrackShopView } from '@/components/recently-viewed/TrackShopView'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  try {
    const shop = await getShop(slug, lang)
    const tr = t(lang)
    const name = shop.name ?? 'Shop'
    const siteUrl = getSiteUrl()
    const canonicalUrl = `${siteUrl}/shops/${slug}`

    // T6/AC-38b: Pad short shop names to reach TITLE_MIN
    const cityHint = shop.address_raw?.split(',').at(-1)?.trim() ?? null
    const categoryHint = shop.shop_type?.canonical ?? null
    const pageTitle = padShopTitle(name, { city: cityHint, category: categoryHint }, lang, 'Pundo')

    // T6/AC-36: Template description with shop-specific data (≥ 110 chars, ≤ 160 chars)
    const description = truncateDescription(
      tr.shop_meta_description(name, cityHint ?? 'Cyprus', categoryHint ?? 'local'),
      { max: 155 },
    )

    // T6/AC-40: OG image — use shop logo if available, else deterministic fallback
    // absolutizeImageUrl ensures OG-image is always an absolute URL (required by crawlers)
    const rawLogoUrl = shop.images?.[0]?.url ?? null
    const logoUrl = absolutizeImageUrl(rawLogoUrl, siteUrl)
    const ogImage = logoUrl
      ? { url: logoUrl, width: 1200 as const, height: 630 as const, alt: name }
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
      alternates: { canonical: canonicalUrl },
      robots: { index: true, follow: true },
      openGraph: og.openGraph,
      twitter: og.twitter,
      ...(og.other ? { other: og.other } : {}),
    }
  } catch {
    return { title: 'Shop' }
  }
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params
  const lang = await getLangServer()
  const tr = t(lang)
  const siteUrl = getSiteUrl()

  let shop
  try {
    shop = await getShop(slug, lang)
  } catch {
    notFound()
  }

  const session = await getCustomerSession(lang)

  const [topProductsResult, offers, relatedShops] = await Promise.all([
    // T4/B5900-003: Gate removed — always fetch products (limit 12, BE-3 fix required for full coverage)
    searchProducts({ shop_id: shop.id, limit: 12 }, lang).then(r => r.items),
    getShopOffers(slug, lang),
    getRelatedShops(slug, lang),
  ])
  const topProducts = topProductsResult

  const pins = shop.location
    ? [{ id: shop.id, name: shop.name ?? 'Shop', lat: shop.location.lat, lng: shop.location.lng }]
    : []

  // Derive city from address (best-effort)
  const cityHint = shop.address_raw?.split(',').at(-1)?.trim() ?? null

  return (
    <main className="min-h-screen bg-bg">
      <TrackShopView
        shop={{
          id: shop.id,
          slug: slug,
          name: shop.name ?? slug,
          image_url: shop.images?.[0]?.url ?? null,
          city: cityHint,
        }}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <BackButton />
        <Breadcrumb items={[
          { label: tr.home, href: '/' },
          { label: tr.nav_shops, href: '/shops' },
          { label: shop.name ?? slug },
        ]} />
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <ShopLogoImage
              url={shop.images?.[0]?.url ?? null}
              name={shop.name ?? null}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-text font-heading">{shop.name}</h1>
              {shop.description && <p className="text-sm text-text-muted mt-1">{shop.description}</p>}
            </div>
          </div>
          {shop.address_raw && <p className="text-text-muted mt-1">{shop.address_raw}</p>}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {shop.whatsapp_number && (
              <a
                href={buildWhatsAppUrl(
                  shop.whatsapp_number,
                  tr.whatsapp_message_shop(shop.name ?? '', new URL(siteUrl).hostname)
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
        </div>

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
            {shop.opening_hours_raw?.weekdayDescriptions ? (
              <ul className="space-y-1">
                {shop.opening_hours_raw.weekdayDescriptions.map((line, i) => (
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
            {(shop.opening_hours_raw?.specialDays?.length ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-text-muted mb-1">Sonderöffnungszeiten</p>
                <ul className="space-y-1">
                  {shop.opening_hours_raw!.specialDays!.map((day, i) => (
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

        {/* Active shop offers */}
        {offers.length > 0 && (
          <div>
            <h2 className="font-bold text-sm text-text font-heading mb-3">{tr.shop_offers}</h2>
            <div className="space-y-2">
              {offers.map(offer => (
                <div key={offer.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-text text-sm">{offer.title}</p>
                    {offer.price && (
                      <span className="text-sm font-bold text-accent shrink-0">
                        {offer.price} {offer.currency}
                      </span>
                    )}
                  </div>
                  {offer.description && (
                    <p className="text-sm text-text-muted mt-1">{offer.description}</p>
                  )}
                  {offer.valid_until && (
                    <p className="text-xs text-text-light mt-2">
                      {tr.shop_offer_valid_until}{' '}
                      {new Date(offer.valid_until).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top products */}
        {topProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-text font-heading">{tr.products}</h2>
              {/* TODO: Folge-Bug B5900-004 — Link führt auf nicht-existierende Route /search?shop_id=... */}
              <Link href={`/search?shop_id=${shop.id}`} className="text-xs text-accent hover:underline">
                Alle →
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
