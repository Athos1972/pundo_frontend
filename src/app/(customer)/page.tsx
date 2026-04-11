import { getLangServer } from '@/lib/lang'
import { getCategories } from '@/lib/api'
import { t } from '@/lib/translations'
import { SearchBar } from '@/components/search/SearchBar'
import { CategoryChips } from '@/components/search/CategoryChips'
import { NearbyShops } from '@/components/shop/NearbyShops'

export default async function HomePage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const categoriesData = await getCategories({ taxonomy_type: 'google', only_with_products: true }, lang).catch(() => ({ items: [] }))

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Hero / Search ── */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text leading-tight mb-2">
              {tr.hero_title}
            </h1>
            <p className="text-text-muted mb-6 text-base">
              {tr.hero_subtitle}
            </p>
            <SearchBar placeholder={tr.search_placeholder} />
            <div className="mt-3">
              <CategoryChips categories={categoriesData.items} lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Shops in der Nähe ── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="font-display text-xl font-bold text-text mb-5">
          {tr.nearby_shops}
        </h2>
        <NearbyShops lang={lang} />
      </main>

    </div>
  )
}
