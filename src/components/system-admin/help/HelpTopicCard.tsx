import Link from 'next/link'
import type { HelpTopic } from '@/lib/system-admin-help'
import { formatDuration } from '@/lib/system-admin-help'
import type { HelpTopicContent } from '@/lib/system-admin-help-content'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface HelpTopicCardProps {
  topic: HelpTopic
  content: HelpTopicContent
  tr: SysAdminTranslations
}

export function HelpTopicCard({ topic, content, tr }: HelpTopicCardProps) {
  const hasVideo = Boolean(topic.videoId)
  return (
    <Link
      href={`/admin/help/${topic.id}`}
      data-testid="help-topic-card"
      data-topic={topic.id}
      className="flex h-full w-full flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 hover:border-slate-500"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {tr.help_topic_label.replace('{n}', topic.number)}
      </span>
      <h2 className="text-base font-semibold text-gray-900">{content.title}</h2>
      <p className="text-sm text-gray-600">{content.summary}</p>
      <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {!topic.noVideo && (
          <span
            data-testid="help-topic-badge"
            data-has-video={hasVideo ? 'true' : 'false'}
            className={`rounded-full px-2 py-0.5 ${hasVideo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {hasVideo ? tr.help_badge_video : tr.help_video_coming_soon}
          </span>
        )}
        {topic.durationSec !== undefined && (
          <span>{tr.help_duration.replace('{t}', formatDuration(topic.durationSec))}</span>
        )}
      </span>
    </Link>
  )
}
