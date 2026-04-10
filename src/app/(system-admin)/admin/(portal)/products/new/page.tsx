import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAllCategories, getAllBrands } from '@/lib/system-admin-api'
import { ProductForm } from '@/components/system-admin/ProductForm'

export default async function NewProductPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const [categories, brands] = await Promise.all([
    getAllCategories().catch(() => []),
    getAllBrands().catch(() => []),
  ])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_products} — {tr.add_new}</h1>
      <ProductForm product={null} attributes={[]} categories={categories} brands={brands} tr={tr} />
    </div>
  )
}
