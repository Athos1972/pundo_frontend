import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getProduct, getProductAttributes, getCategoriesByIds, getBrandsByIds } from '@/lib/system-admin-api'
import { ProductForm } from '@/components/system-admin/ProductForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const [product, attributes] = await Promise.all([
    getProduct(Number(id)).catch(() => null),
    getProductAttributes(Number(id)).catch(() => []),
  ])

  if (!product) notFound()
  // only the selected entries: the form searches the rest on the server (B8200-004)
  const [categories, brands] = await Promise.all([
    getCategoriesByIds([product.category_id]),
    getBrandsByIds([product.brand_id]),
  ])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_products} — {product.names?.['en'] ?? product.slug}</h1>
      <ProductForm product={product} attributes={attributes} categories={categories} brands={brands} tr={tr} />
    </div>
  )
}
