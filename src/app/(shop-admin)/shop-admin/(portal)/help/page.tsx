import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { shopAdminHelpContent } from '@/lib/shop-admin-help-content'

export default async function ShopAdminHelpPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)
  const categories = shopAdminHelpContent[lang as keyof typeof shopAdminHelpContent] ?? shopAdminHelpContent.en

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{tr.help_title}</h1>
      <div className="flex flex-col gap-8">
        {categories.map((cat) => (
          <section key={cat.title}>
            <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
              {cat.title}
            </h2>
            <div className="flex flex-col divide-y divide-gray-100">
              {cat.items.map((item) => (
                <details
                  key={item.q}
                  className="group py-3 [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex items-center justify-between gap-3 text-sm font-medium text-gray-800 select-none cursor-pointer rtl:flex-row-reverse">
                    <span>{item.q}</span>
                    <span className="text-gray-400 shrink-0 transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed rtl:text-right">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
