import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ProductForm } from '@/components/shop-admin/ProductForm'
import { getAdminCategories } from '@/lib/shop-admin-api'

export default async function NewProductPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let categories: { id: number; name: string }[] = []
  try {
    categories = await getAdminCategories(lang)
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.add_product}</h1>
      <ProductForm categories={categories} lang={lang} />
    </div>
  )
}
