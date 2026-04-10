import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { BrandForm } from '@/components/system-admin/BrandForm'

export default async function NewBrandPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_brands} — {tr.add_new}</h1>
      <BrandForm brand={null} tr={tr} />
    </div>
  )
}
