import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { youtubeWatchUrl } from '@/lib/system-admin-help'

interface HelpVideoButtonProps {
  videoId?: string
  tr: SysAdminTranslations
}

/** Link-out to YouTube (new tab). Without a video ID there is no link, only a hint. */
export function HelpVideoButton({ videoId, tr }: HelpVideoButtonProps) {
  if (!videoId) {
    return (
      <span
        data-testid="help-video-soon"
        className="inline-flex items-center rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500"
      >
        {tr.help_video_coming_soon}
      </span>
    )
  }
  return (
    <a
      href={youtubeWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="help-video-link"
      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
    >
      <span aria-hidden="true">▶</span>
      {tr.help_watch_video}
      <span className="sr-only">{tr.help_new_tab_hint}</span>
    </a>
  )
}
