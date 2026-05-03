import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getItemDomainMapping } from '@/lib/system-admin-api'
import { MappingForm } from '../../MappingForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditItemDomainMappingPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const mapping = await getItemDomainMapping(Number(id)).catch(() => null)
  if (!mapping) notFound()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/item-domain-mappings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {tr.idm_title}
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-gray-900">{tr.edit} — #{mapping.id}</h1>
      <MappingForm tr={tr} mode="edit" mapping={mapping} />
    </div>
  )
}
