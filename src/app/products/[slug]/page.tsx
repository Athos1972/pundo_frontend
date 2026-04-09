import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { getProduct } from '@/lib/api'
import { t } from '@/lib/translations'
import { formatSizeAttr } from '@/lib/utils'
import { OfferList } from '@/components/product/OfferList'
import { PriceHistory } from '@/components/ui/PriceHistory'
import { BackButton } from '@/components/ui/BackButton'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  try {
    const product = await getProduct(slug, lang)
    const name = product.names[lang] ?? product.names.en ?? slug
    const price = product.offers[0]?.price
    return {
      title: `${name}${price ? ` — ${price} €` : ''} | Pundo`,
      description: product.descriptions?.[lang] ?? product.descriptions?.en ?? undefined,
    }
  } catch {
    return { title: 'Produkt | Pundo' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const lang = await getLangServer()
  const tr = t(lang)

  let product
  try {
    product = await getProduct(slug, lang)
  } catch {
    notFound()
  }

  const name = product.names[lang] ?? product.names.en ?? slug
  const sizeStr = formatSizeAttr(product.attributes?.size)

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />
        {/* Hero */}
        <div className="flex gap-4 mb-6">
          <div className="w-24 h-24 flex-shrink-0 bg-surface-alt rounded-xl flex items-center justify-center overflow-hidden">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(product.images[0])} alt={name} className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 64 64" className="w-12 h-12 text-text-light" fill="none">
                <rect x="12" y="12" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="m12 44 12-12 10 10 6-6 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>
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
          <h2 className="font-bold text-sm text-text mb-3" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{tr.all_offers}</h2>
          <OfferList offers={product.offers} lang={lang} />
        </div>
      </div>
    </main>
  )
}
