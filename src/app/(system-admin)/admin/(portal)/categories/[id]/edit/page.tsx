import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategory, getCategoryTranslations, getAllCategories } from '@/lib/system-admin-api'
import { CategoryForm } from '@/components/system-admin/CategoryForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const [category, translations, allCategories] = await Promise.all([
    getCategory(Number(id)).catch(() => null),
    getCategoryTranslations(Number(id)).catch(() => []),
    getAllCategories().catch(() => []),
  ])

  if (!category) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_categories} — {category.name}</h1>
      <CategoryForm
        category={category}
        allCategories={allCategories}
        translations={translations}
        tr={tr}
      />
    </div>
  )
}
