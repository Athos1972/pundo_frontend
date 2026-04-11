import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAllCategories } from '@/lib/system-admin-api'
import { CategoryForm } from '@/components/system-admin/CategoryForm'

export default async function NewCategoryPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const allCategories = await getAllCategories().catch(() => [])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_categories} — {tr.add_new}</h1>
      <CategoryForm category={null} allCategories={allCategories} translations={[]} attrDefs={[]} tr={tr} />
    </div>
  )
}
