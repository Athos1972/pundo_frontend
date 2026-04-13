import type { Metadata } from 'next'
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { forShopsContent } from '@/lib/for-shops-content'
import type { Lang } from '@/lib/lang'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_for_shops} — pundo` }
}

export default async function ForShopsPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const content = forShopsContent[lang as Lang] ?? forShopsContent.en

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
      {/* Hero */}
      <section className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {content.hero_headline}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
          {content.hero_sub}
        </p>
        <Link
          href="/shop-admin/register"
          className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          {content.cta_label}
        </Link>
      </section>

      {/* Features */}
      <section className="mb-12 sm:mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {content.features_title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {content.features.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-xl p-5">
              <div className="text-2xl mb-2" aria-hidden="true">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {content.steps_title}
        </h2>
        <ol className="flex flex-col gap-6">
          {content.steps.map((s) => (
            <li key={s.num} className="flex gap-4 rtl:flex-row-reverse">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {s.num}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom CTA */}
      <section className="text-center">
        <Link
          href="/shop-admin/register"
          className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          {content.cta_label}
        </Link>
      </section>

      {/* Help link */}
      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/help" className="underline hover:text-gray-700 transition-colors">
          {tr.footer_help}
        </Link>
        {' · '}
        <Link href="/contact" className="underline hover:text-gray-700 transition-colors">
          {tr.footer_contact}
        </Link>
      </p>
    </main>
  )
}
