import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { getShop, searchProducts } from '@/lib/api'
import { t } from '@/lib/translations'
import Link from 'next/link'
import { ShopMapClient } from '@/components/map/ShopMapClient'
import { BackButton } from '@/components/ui/BackButton'
import { LanguageChips } from '@/components/ui/LanguageChips'
import { ProductCard } from '@/components/product/ProductCard'
import { ReviewSection } from '@/components/reviews/ReviewSection'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  try {
    const shop = await getShop(slug, lang)
    return { title: `${shop.name ?? 'Shop'} | Pundo` }
  } catch {
    return { title: 'Shop | Pundo' }
  }
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params
  const lang = await getLangServer()
  const tr = t(lang)

  let shop
  try {
    shop = await getShop(slug, lang)
  } catch {
    notFound()
  }

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
          {shop.address_raw && <p className="text-text-muted mt-1">{shop.address_raw}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${shop.status === 'active' ? 'bg-success/10 text-success' : 'bg-surface-alt text-text-muted'}`}>
              {shop.status}
            </span>
            {shop.phone && <a href={`tel:${shop.phone}`} className="text-sm text-accent">{shop.phone}</a>}
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
        {shop.opening_hours && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h2 className="font-bold text-sm text-text mb-3" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.opening_hours}</h2>
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
                <ProductCard key={p.id} item={p} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewSection entityType="shop" entityId={shop.id} lang={lang} tr={tr} />
      </div>
    </main>
  )
}
