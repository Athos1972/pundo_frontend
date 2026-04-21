import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { getShop, searchProducts } from '@/lib/api'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildLocalBusinessSchema, safeJson } from '@/lib/structured-data'
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

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  try {
    const shop = await getShop(slug, lang)
    const name = shop.name ?? 'Shop'
    const description = shop.address_raw ?? undefined
    const siteUrl = getSiteUrl()
    return {
      title: name,
      description,
      openGraph: {
        type: 'website',
        title: name,
        description,
        url: `${siteUrl}/shops/${slug}`,
      },
      twitter: {
        card: 'summary',
        title: name,
        description,
      },
      alternates: { canonical: `${siteUrl}/shops/${slug}` },
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

  const topProducts = shop.top_products.length > 0
    ? (await searchProducts({ shop_id: shop.id, limit: 10 }, lang)).items
    : []

  const pins = shop.location
    ? [{ id: shop.id, name: shop.name ?? 'Shop', lat: shop.location.lat, lng: shop.location.lng }]
    : []

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <BackButton />
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-text" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{shop.name}</h1>
          {shop.description && <p className="text-sm text-text-muted mt-1">{shop.description}</p>}
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
              <LanguageChips languages={shop.spoken_languages} label={tr.spoken_languages} />
            </div>
          )}
        </div>

        {/* Map */}
        {pins.length > 0 && (
          <ShopMapClient shops={pins} className="w-full h-48 rounded-xl overflow-hidden" lang={lang} zoom={17} />
        )}

        {/* Opening hours */}
        {(shop.opening_hours_raw || shop.opening_hours) && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h2 className="font-bold text-sm text-text mb-3" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.opening_hours}</h2>
            {shop.opening_hours_raw?.weekdayDescriptions ? (
              <ul className="space-y-1">
                {shop.opening_hours_raw.weekdayDescriptions.map((line, i) => (
                  <li key={i} className="text-sm text-text">{line}</li>
                ))}
              </ul>
            ) : shop.opening_hours ? (
              <div className="space-y-1">
                {(['mon','tue','wed','thu','fri','sat','sun','ph'] as const)
                  .filter(key => key in shop.opening_hours!)
                  .map(key => {
                    const hours = shop.opening_hours![key]
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-text-muted">{tr.days[key]}</span>
                        <span className={hours ? 'text-text' : 'text-text-light'}>
                          {hours ? String(hours) : tr.closed}
                        </span>
                      </div>
                    )
                  })}
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

        {/* Top products */}
        {topProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-text" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.products}</h2>
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

        {/* Community Feedback */}
        <CommunityFeedbackSection
          shopId={shop.id}
          shopTypeCanonical={shop.shop_type?.canonical ?? null}
          isAuthenticated={session.is_authenticated}
          lang={lang}
        />

        {/* Reviews */}
        <ReviewSection entityType="shop" entityId={shop.id} lang={lang} tr={tr} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(buildLocalBusinessSchema(shop, siteUrl)) }}
      />
    </main>
  )
}
