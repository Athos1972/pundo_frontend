import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { ProductForm } from '@/components/system-admin/ProductForm'

export default async function NewProductPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_products} — {tr.add_new}</h1>
      <ProductForm product={null} attributes={[]} categories={[]} brands={[]} tr={tr} />
    </div>
  )
}
