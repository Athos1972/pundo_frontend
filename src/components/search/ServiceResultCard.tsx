'use client'

import { useRouter } from 'next/navigation'
import type { SearchServiceItem } from '@/types/api'
import { t } from '@/lib/translations'
import type { Lang } from '@/lib/lang'
import { localePath } from '@/lib/routing'

interface ServiceResultCardProps {
  item: SearchServiceItem
  lang: string
}

/**
 * Card for a service category search result (result_type='service').
 *
 * Visually distinct from ProductCard:
 *  - Purple/indigo accent badge "Service / Dienstleistung / ..."
 *  - Shows provider_count in the map viewport (or Cyprus-wide)
 *  - CTA routes to /shops?service=<category_id>
 *  - RTL support via Tailwind rtl: modifiers (AC11)
 *
 * F5910 Service-Discovery-Bridge
 */
export function ServiceResultCard({ item, lang }: ServiceResultCardProps) {
  const router = useRouter()
  const tr = t(lang)

  const providerLabel =
    item.provider_count === 0
      ? tr.result_service_providers_in_view_zero
      : tr.result_service_providers_in_view(item.provider_count)

  function handleClick() {
    router.push(localePath(lang as Lang, '/shops') + `?service=${item.category_id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-start rtl:text-end bg-surface border border-indigo-200 dark:border-indigo-900 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-sm transition-all flex items-stretch group"
      aria-label={`${item.name} — ${providerLabel}`}
    >
      {/* Left accent strip — indigo to distinguish from product cards */}
      <div className="w-1.5 shrink-0 bg-indigo-500 group-hover:bg-indigo-600 transition-colors" />

      {/* Main content */}
      <div className="p-3 flex flex-col justify-between flex-1 min-w-0 gap-2">
        <div className="flex items-start justify-between gap-2">
          {/* Name + badge */}
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold px-2 py-0.5 mb-1 rtl:ml-0 rtl:mr-0">
              {tr.result_service_badge}
            </span>
            <p className="font-bold text-text text-sm leading-snug line-clamp-2 font-heading">
              {item.name}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Provider count */}
          <span className="text-xs text-text-muted flex items-center gap-1 rtl:flex-row-reverse">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M10.5 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className={item.provider_count === 0 ? 'text-text-muted' : 'text-text'}>
              {providerLabel}
            </span>
          </span>

          {/* CTA */}
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0 group-hover:underline rtl:text-start">
            {tr.result_service_cta} &rarr;
          </span>
        </div>
      </div>
    </button>
  )
}
