import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { getProduct, getRelatedProducts, getRelatedCategories } from '@/lib/api'
import { t } from '@/lib/translations'
import { formatSizeAttr, toRelativeImageUrl, pickImg } from '@/lib/utils'
import { getSiteUrl } from '@/lib/seo'
import { truncateTitle, truncateDescription } from '@/lib/seo/metadata-defaults'
import { buildCompleteOpenGraph, pickShopFallbackOgImage } from '@/lib/seo/og-defaults'
import { buildProductSchema, safeJson } from '@/lib/structured-data'
import { localePath, buildHreflang } from '@/lib/routing'
import { OfferList } from '@/components/product/OfferList'
import { ProductHeroImage } from '@/components/product/ProductHeroImage'
import { RelatedProductsCarousel } from '@/components/product/RelatedProductsCarousel'
import { PriceHistory } from '@/components/ui/PriceHistory'
import { BackButton } from '@/components/ui/BackButton'
import { PriceFilterToggle } from '@/components/ui/PriceFilterToggle'
import { ReviewSection } from '@/components/reviews/ReviewSection'
import { getCustomerSession } from '@/lib/customer-api'
import { TrackProductView } from '@/components/recently-viewed/TrackProductView'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { RelatedCategoriesCard } from '@/components/product/RelatedCategoriesCard'
import { FavoriteButton } from '@/components/product/FavoriteButton'
import { PixelViewContent } from '@/components/consent/PixelViewContent'

interface Props {
  params: Promise<{ lang: string; slug: string }>
  searchParams: Promise<{ with_price?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  try {
    const product = await getProduct(slug, lang)
    const tr = t(lang)
    const name = product.names[lang] ?? product.names.en ?? slug
    const brandName = product.brand?.name ?? 'Pundo'

    // T5/AC-38: Title — truncate name to fit " | Pundo" suffix, no price in title
    const suffixLen = Array.from(` | ${brandName}`).length
    const truncatedName = truncateTitle(name, { max: 60, reserved: suffixLen })
    const pageTitle = `${truncatedName} | ${brandName}`

    // T5/AC-36: Description — first 155 chars of product description, fallback template
    const rawDesc = product.descriptions?.[lang] ?? product.descriptions?.en ?? ''
    const description = truncateDescription(
      rawDesc || tr.product_desc_fallback(name, brandName),
      { max: 155 },
    )

    const relativeImg = toRelativeImageUrl(product.images?.card) ?? toRelativeImageUrl(product.thumbnail_url)
    const siteUrl = getSiteUrl()
    const canonicalUrl = `${siteUrl}/${lang}/products/${slug}`

    // Choose OG image: use product image or fallback
    const ogImage = relativeImg
      ? { url: relativeImg.startsWith('http') ? relativeImg : `${siteUrl}${relativeImg}`, width: 1200 as const, height: 630 as const, alt: name }
      : pickShopFallbackOgImage(product.id ?? 0, siteUrl)

    const og = buildCompleteOpenGraph({
      title: pageTitle,
      description,
      url: canonicalUrl,
      type: 'product',
      locale: lang,
      siteName: brandName,
      image: ogImage,
    })

    return {
      title: { absolute: pageTitle },
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: buildHreflang(siteUrl, `/products/${slug}`),
      },
      robots: { index: true, follow: true },
      openGraph: og.openGraph,
      twitter: og.twitter,
      ...(og.other ? { other: og.other } : {}),
    }
  } catch {
    return { title: 'Produkt' }
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const { with_price } = await searchParams
  const withPrice = with_price === '1'
  const tr = t(lang)

  // Stufe 1: Fetch product + related in parallel; failures must not break the page.
  const [productResult, relatedResult, session] = await Promise.allSettled([
    getProduct(slug, lang),
    getRelatedProducts(slug, lang),
    getCustomerSession(lang),
  ])

  if (productResult.status === 'rejected') notFound()
  const product = productResult.value
  // Filter out the current product defensively in case the backend misses it.
  const relatedItems = relatedResult.status === 'fulfilled'
    ? relatedResult.value.items.filter(p => p.slug !== slug)
    : []
  const isAuthenticated = session.status === 'fulfilled' && session.value.is_authenticated

  // Stufe 2: Verwandte Kategorien — sequenziell, da product.category.id erst jetzt bekannt.
  const relatedCategories = product.category
    ? await getRelatedCategories(product.category.id, lang).then(r => r.items).catch(() => [])
    : []

  const siteUrl = getSiteUrl()
  const name = product.names[lang] ?? product.names.en ?? slug
  const sizeStr = formatSizeAttr(product.attributes?.size)

  const firstImgUrl = pickImg(product.images, 'detail', product.thumbnail_url)
  const origImgUrl  = toRelativeImageUrl(product.images?.orig) ?? firstImgUrl ?? undefined
  const visibleOffers = withPrice
    ? product.offers.filter(o => o.price_type === 'fixed')
    : product.offers

  const firstOffer = product.offers[0]
  const priceDisplay = firstOffer?.price_type === 'fixed' && firstOffer.price
    ? `${firstOffer.price} €`
    : null

  return (
    <main className="min-h-screen bg-bg">
      <PixelViewContent contentName={name} contentId={slug} contentType="product" />
      <TrackProductView
        product={{
          id: product.id,
          slug: product.slug ?? slug,
          name,
          image_url: firstImgUrl ?? null,
          price_display: priceDisplay,
        }}
      />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />
        <Breadcrumb items={[
          { label: tr.home, href: localePath(lang, '/') },
          ...(product.category?.name ? [{ label: product.category.name, href: localePath(lang, `/search?category_id=${product.category.id}`) }] : []),
          { label: name },
        ]} />
        {/* Hero */}
        <div className="flex gap-4 mb-6">
          {firstImgUrl && (
            <ProductHeroImage src={firstImgUrl} origSrc={origImgUrl} alt={name} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-extrabold text-text leading-tight font-heading">{name}</h1>
              <FavoriteButton productId={product.id} lang={lang} size="md" className="shrink-0 mt-0.5" />
            </div>
            {product.brand && <p className="text-sm text-text-muted mt-1">{product.brand.name}</p>}
            {product.category && <p className="text-xs text-text-light mt-0.5">{product.category.name}</p>}
            {sizeStr && <p className="text-xs text-text-light mt-0.5">{sizeStr}</p>}
          </div>
        </div>

        {/* Price history — T7: threshold lowered from ≥2 to ≥1 (AC-8/AC-9) */}
        {product.price_history.length >= 1 && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-4">
            <h2 className="font-bold text-sm text-text mb-3 font-heading">{tr.price_history}</h2>
            <PriceHistory items={product.price_history} lang={lang} currencySymbol="€" />
          </div>
        )}

        {/* Offers */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-text font-heading">{tr.all_offers}</h2>
            <PriceFilterToggle />
          </div>
          <OfferList offers={visibleOffers} lang={lang} productName={name} />
        </div>

        {/* Related products carousel — hidden when empty */}
        <RelatedProductsCarousel
          items={relatedItems}
          lang={lang}
          title={tr.related_products}
        />

        {/* Reviews */}
        <ReviewSection entityType="product" entityId={product.id} lang={lang} tr={tr} isAuthenticated={isAuthenticated} />

        {/* Verwandte Kategorien */}
        <RelatedCategoriesCard
          categories={relatedCategories}
          lang={lang}
          title={tr.related_categories}
        />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(buildProductSchema(product, lang, siteUrl)) }}
      />
    </main>
  )
}
