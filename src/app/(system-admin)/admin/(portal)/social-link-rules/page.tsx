import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getSocialLinkRules } from '@/lib/system-admin-api'
import { RuleList } from './RuleList'
import type { SocialLinkRuleCategory } from '@/types/system-admin'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>
}

export default async function SocialLinkRulesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1))
  const q = sp.q ?? ''
  const category = (sp.category ?? '') as SocialLinkRuleCategory | ''

  const data = await getSocialLinkRules({
    q: q || undefined,
    category: category || undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }).catch(() => ({
    items: [] as Awaited<ReturnType<typeof getSocialLinkRules>>['items'],
    total: 0,
    limit: LIMIT,
    offset: 0,
  }))

  const CATEGORIES: SocialLinkRuleCategory[] = ['adult', 'gambling', 'hate', 'illegal', 'malware', 'custom']

  const categoryLabel: Record<SocialLinkRuleCategory, string> = {
    adult: tr.slr_cat_adult,
    gambling: tr.slr_cat_gambling,
    hate: tr.slr_cat_hate,
    illegal: tr.slr_cat_illegal,
    malware: tr.slr_cat_malware,
    custom: tr.slr_cat_custom,
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.slr_title}</h1>
        <Link
          href="/admin/social-link-rules/new"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {tr.slr_new}
        </Link>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap items-end">
        <input
          name="q"
          defaultValue={q}
          placeholder={tr.slr_host_placeholder}
          className="flex-1 min-w-32 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
        <select
          name="category"
          defaultValue={category}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="">— {tr.slr_category} —</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{categoryLabel[cat]}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-lg"
        >
          ↵
        </button>
        {(q || category) && (
          <a href="/admin/social-link-rules" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            {tr.clear}
          </a>
        )}
      </form>

      <RuleList
        rules={data.items}
        total={data.total}
        page={page}
        limit={LIMIT}
        tr={tr}
        q={q}
        category={category}
      />
    </div>
  )
}
