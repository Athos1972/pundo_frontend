import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ProductForm } from '@/components/shop-admin/ProductForm'
import { getAdminCategories, getAdminProducts, getAdminPriceUnits } from '@/lib/shop-admin-api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let categories: { id: number; name: string }[] = []
  let priceUnits: Awaited<ReturnType<typeof getAdminPriceUnits>> = []
  let product = null

  try {
    const [cats, productData, units] = await Promise.all([
      getAdminCategories(lang),
      getAdminProducts(lang),
      getAdminPriceUnits(lang),
    ])
    categories = cats
    priceUnits = units
    product = productData.items.find((p) => p.id === Number(id)) ?? null
  } catch {
    // Backend not yet available
  }

  if (product === null && process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.edit} — {product?.name ?? `#${id}`}</h1>
      <ProductForm product={product ?? undefined} categories={categories} priceUnits={priceUnits} lang={lang} />
    </div>
  )
}
