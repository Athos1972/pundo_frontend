import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getShops } from '@/lib/api'
import { ShopCard } from '@/components/shop/ShopCard'
import { BackButton } from '@/components/ui/BackButton'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_shops} — pundo` }
}

export default async function ShopsIndexPage() {
  const lang = await getLangServer()
  const tr = t(lang)

  let shops: Awaited<ReturnType<typeof getShops>>['items'] = []
  try {
    const res = await getShops({ limit: 50 }, lang)
    shops = res.items
  } catch {
    // backend unreachable — show empty state
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-bold">{tr.page_title_shops}</h1>
      {shops.length === 0 ? (
        <p className="text-sm text-text-muted">{tr.shops_empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shops.map((shop) => (
            <ShopCard key={shop.slug} shop={shop} lang={lang} />
          ))}
        </div>
      )}
    </main>
  )
}
