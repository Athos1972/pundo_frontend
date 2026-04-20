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
        className="flex w-40 shrink-0 flex-col gap-2 rounded-2xl bg-surface-alt p-4 hover:bg-surface-alt/80 transition-colors"
      >
        <span className="text-2xl">{guide.icon}</span>
        <span className="text-[11px] font-medium text-accent">{categoryLabel ?? guide.category}</span>
        <span className="text-sm font-semibold leading-snug text-gray-900 line-clamp-3">
          {guide.title}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl">{guide.icon}</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          {categoryLabel ?? guide.category}
        </span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 leading-snug">{guide.title}</p>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{guide.description}</p>
      </div>
      {readtimeLabel && (
        <p className="text-xs text-gray-400">{readtimeLabel}</p>
      )}
    </Link>
  )
}
