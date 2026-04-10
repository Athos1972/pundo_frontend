import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getAdminProducts } from '@/lib/shop-admin-api'
import { ProductList } from '@/components/shop-admin/ProductList'
import Link from 'next/link'

export default async function ProductsPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let items: Awaited<ReturnType<typeof getAdminProducts>>['items'] = []
  try {
    const data = await getAdminProducts(lang, { limit: 50 })
    items = data.items
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tr.products_title}</h1>
        <Link
          href="/shop-admin/products/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold
            hover:bg-accent-dark transition-colors"
        >
          + {tr.add_product}
        </Link>
      </div>
      <ProductList initialItems={items} lang={lang} />
    </div>
  )
}
