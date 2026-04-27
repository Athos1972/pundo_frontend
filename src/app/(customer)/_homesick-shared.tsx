import { getBrandFromHeaders } from '@/config/brands'
import { getLangServer } from '@/lib/lang'
import { notFound } from 'next/navigation'
import { HomesickTeaser } from '@/components/home/HomesickTeaser'

export async function HomesickPageImpl() {
  const brand = await getBrandFromHeaders()
  if (!brand.features.homesickTeaser) notFound()
  const lang = await getLangServer()
  return (
    <div className="min-h-screen bg-bg py-16">
      <HomesickTeaser brand={brand} lang={lang} variant="page" />
    </div>
  )
}
