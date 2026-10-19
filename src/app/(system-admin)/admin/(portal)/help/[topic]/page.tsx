import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { requireAdminSession } from '@/lib/system-admin-session'
import { formatDuration, getHelpTopic } from '@/lib/system-admin-help'
import { HELP_CONTENT, helpLang } from '@/lib/system-admin-help-content'
import { HelpSop } from '@/components/system-admin/help/HelpSop'
import { HelpVideoButton } from '@/components/system-admin/help/HelpVideoButton'

interface PageProps {
  params: Promise<{ topic: string }>
}

// Static title on purpose: metadata resolves in parallel to the session check and would otherwise
// put the topic title into the response of an unauthenticated request (RSC payload).
export async function generateMetadata(): Promise<Metadata> {
  const tr = tSysAdmin(await getLangServer())
  return { title: tr.help_title }
}

export default async function AdminHelpTopicPage({ params }: PageProps) {
  await requireAdminSession()
  const { topic: id } = await params
  const topic = getHelpTopic(id)
  if (!topic) notFound()

  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const hl = helpLang(lang)
  const content = HELP_CONTENT[topic.id][hl]

  return (
    <div lang={hl} className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/help" className="text-sm text-gray-500 hover:text-gray-800">
          {tr.help_back_to_list}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {tr.help_topic_label.replace('{n}', topic.number)}
        </span>
        <h1 className="text-2xl font-semibold text-gray-900">{content.title}</h1>
        {content.intro && <p className="text-sm text-gray-600">{content.intro}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HelpVideoButton videoId={topic.videoId} tr={tr} />
        {topic.durationSec !== undefined && (
          <span className="text-xs text-gray-500">{tr.help_duration.replace('{t}', formatDuration(topic.durationSec))}</span>
        )}
        {topic.videoId && <span className="text-xs text-gray-500">{tr.help_subtitles_hint}</span>}
      </div>

      <HelpSop content={content} tr={tr} />

      <nav aria-label={tr.help_open_in_admin} className="flex flex-wrap gap-2">
        {topic.adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            data-testid="help-admin-link"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {tr.help_open_in_admin}: {tr[link.navKey]}
          </Link>
        ))}
      </nav>
    </div>
  )
}
