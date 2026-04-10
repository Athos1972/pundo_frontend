import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategoryAttributeDefs } from '@/lib/system-admin-api'
import { AttrDefEditForm } from './AttrDefEditForm'

interface PageProps {
  params: Promise<{ categoryId: string; id: string }>
}

export default async function EditAttrDefPage({ params }: PageProps) {
  const { categoryId, id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const defs = await getCategoryAttributeDefs(Number(categoryId)).catch(() => [])
  const def = defs.find((d) => d.id === Number(id))
  if (!def) notFound()

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_cat_attr_defs} — {def.key}</h1>
      <AttrDefEditForm def={def} categoryId={categoryId} tr={tr} />
    </div>
  )
}
