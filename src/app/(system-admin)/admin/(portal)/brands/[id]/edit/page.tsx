import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getBrand } from '@/lib/system-admin-api'
import { BrandForm } from '@/components/system-admin/BrandForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBrandPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const brand = await getBrand(Number(id)).catch(() => null)
  if (!brand) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_brands} — {brand.name}</h1>
      <BrandForm brand={brand} tr={tr} />
    </div>
  )
}
