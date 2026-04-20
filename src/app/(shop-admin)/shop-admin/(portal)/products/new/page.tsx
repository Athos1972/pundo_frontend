import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ProductForm } from '@/components/shop-admin/ProductForm'
import { getAdminCategories, getAdminPriceUnits } from '@/lib/shop-admin-api'

export default async function NewProductPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let categories: { id: number; name: string }[] = []
  let priceUnits: Awaited<ReturnType<typeof getAdminPriceUnits>> = []
  try {
    ;[categories, priceUnits] = await Promise.all([
      getAdminCategories(lang),
      getAdminPriceUnits(lang),
    ])
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.add_product}</h1>
      <ProductForm categories={categories} priceUnits={priceUnits} lang={lang} />
    </div>
  )
}
