import Link from 'next/link'
import type { GuideMeta } from '@/lib/guides'

type Props = {
  guide: GuideMeta
  href: string
  variant: 'grid' | 'teaser'
  categoryLabel?: string
  readtimeLabel?: string
}

export function GuideCard({ guide, href, variant, categoryLabel, readtimeLabel }: Props) {
  if (variant === 'teaser') {
    return (
      <Link
        href={href}
        className="flex w-40 shrink-0 flex-col gap-2 rounded-xl bg-surface border border-border p-3 hover:border-accent transition-colors"
      >
        <span className="text-2xl">{guide.icon}</span>
        <span className="text-[11px] font-medium text-accent">{categoryLabel ?? guide.category}</span>
        <span className="text-sm font-semibold leading-snug text-text line-clamp-3">
          {guide.title}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl">{guide.icon}</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          {categoryLabel ?? guide.category}
        </span>
      </div>
      <div>
        <p className="font-semibold text-text leading-snug">{guide.title}</p>
        <p className="mt-1 text-sm text-text-muted line-clamp-2">{guide.description}</p>
      </div>
      {readtimeLabel && (
        <p className="text-xs text-text-light">{readtimeLabel}</p>
      )}
    </Link>
  )
}
