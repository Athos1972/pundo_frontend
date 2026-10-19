import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { requireAdminSession } from '@/lib/system-admin-session'
import { HELP_TOPICS } from '@/lib/system-admin-help'
import { HELP_CONTENT, helpLang } from '@/lib/system-admin-help-content'
import { HelpTopicCard } from '@/components/system-admin/help/HelpTopicCard'

export async function generateMetadata(): Promise<Metadata> {
  const tr = tSysAdmin(await getLangServer())
  return { title: tr.help_title }
}

export default async function AdminHelpPage() {
  await requireAdminSession()
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const hl = helpLang(lang)
  const topics = [...HELP_TOPICS].sort((a, b) => a.order - b.order)

  return (
    <div lang={hl} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{tr.help_title}</h1>
        <p className="mt-1 text-sm text-gray-500">{tr.help_subtitle}</p>
      </div>
      <ul aria-label={tr.help_topics_aria} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.id} className="flex">
            <HelpTopicCard topic={topic} content={HELP_CONTENT[topic.id][hl]} tr={tr} />
          </li>
        ))}
      </ul>
    </div>
  )
}
