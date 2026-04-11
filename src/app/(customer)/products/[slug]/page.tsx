import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { getProduct, getRelatedProducts } from '@/lib/api'
import { t } from '@/lib/translations'
import { formatSizeAttr, toRelativeImageUrl } from '@/lib/utils'
import { OfferList } from '@/components/product/OfferList'
import { ProductHeroImage } from '@/components/product/ProductHeroImage'
import { RelatedProductsCarousel } from '@/components/product/RelatedProductsCarousel'
import { PriceHistory } from '@/components/ui/PriceHistory'
import { BackButton } from '@/components/ui/BackButton'
import { PriceFilterToggle } from '@/components/ui/PriceFilterToggle'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ with_price?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  try {
    const product = await getProduct(slug, lang)
    const name = product.names[lang] ?? product.names.en ?? slug
    const firstOffer = product.offers[0]
    const priceDisplay = firstOffer?.price_type === 'fixed' && firstOffer.price
      ? ` — ${firstOffer.price} €`
      : ''
    return {
      title: `${name}${priceDisplay} | Pundo`,
      description: product.descriptions?.[lang] ?? product.descriptions?.en ?? undefined,
    }
  } catch {
    return { title: 'Produkt | Pundo' }
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { with_price } = await searchParams
  const withPrice = with_price === '1'
  const lang = await getLangServer()
  const tr = t(lang)

  // Fetch product + related in parallel; related failure must not break the page.
  const [productResult, relatedResult] = await Promise.allSettled([
    getProduct(slug, lang),
    getRelatedProducts(slug, lang),
  ])

  if (productResult.status === 'rejected') notFound()
  const product = productResult.value
  // Filter out the current product defensively in case the backend misses it.
  const relatedItems = relatedResult.status === 'fulfilled'
    ? relatedResult.value.items.filter(p => p.slug !== slug)
    : []

  const name = product.names[lang] ?? product.names.en ?? slug
  const sizeStr = formatSizeAttr(product.attributes?.size)

  // Prefer relative URL from images[] to avoid absolute localhost URLs that break on mobile
  const firstImgUrl = (() => {
    const img = product.images?.[0]
    if (img && typeof img === 'object' && img !== null && 'url' in img) return String((img as { url: string }).url)
    return toRelativeImageUrl(product.thumbnail_url)
  })()
  const visibleOffers = withPrice
    ? product.offers.filter(o => o.price_type === 'fixed')
    : product.offers

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />
        {/* Hero */}
        <div className="flex gap-4 mb-6">
          {firstImgUrl && (
            <ProductHeroImage src={firstImgUrl} alt={name} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-text leading-tight" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{name}</h1>
            {product.brand && <p className="text-sm text-text-muted mt-1">{product.brand.name}</p>}
            {product.category && <p className="text-xs text-text-light mt-0.5">{product.category.name}</p>}
            {sizeStr && <p className="text-xs text-text-light mt-0.5">{sizeStr}</p>}
          </div>
        </div>

        {/* Price history */}
        {product.price_history.length >= 2 && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-4">
            <h2 className="font-bold text-sm text-text mb-3" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.price_history}</h2>
            <PriceHistory items={product.price_history} />
          </div>
        )}

        {/* Offers */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-text" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.all_offers}</h2>
            <PriceFilterToggle />
          </div>
          <OfferList offers={visibleOffers} lang={lang} />
        </div>

        {/* Related products carousel — hidden when empty */}
        <RelatedProductsCarousel
          items={relatedItems}
          lang={lang}
          title={tr.related_products}
        />
      </div>
    </main>
  )
}
