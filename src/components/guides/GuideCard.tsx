import Link from 'next/link'
import type { GuideMeta } from '@/lib/guides'
import { hasImageMeta } from '@/lib/guide-images'

type Props = {
  guide: GuideMeta
  href: string
  variant: 'grid' | 'teaser'
  categoryLabel?: string
  readtimeLabel?: string
}

/** Compact hero image for guide cards — uses pre-encoded 480 px WebP/AVIF. */
function GuideCardImage({ slug, alt }: { slug: string; alt: string }) {
  const base = `/images/guides/${slug}-hero`
  return (
    <div className="relative h-28 w-full overflow-hidden rounded-xl bg-surface-alt">
      <picture>
        <source srcSet={`${base}-480.avif`} type="image/avif" />
        <source srcSet={`${base}-480.webp`} type="image/webp" />
        <img
          src={`${base}-480.webp`}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    </div>
  )
}

export function GuideCard({ guide, href, variant, categoryLabel, readtimeLabel }: Props) {
  const hasImage = !!guide.hero_alt && hasImageMeta(`${guide.slug}/hero`)

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
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface hover:border-accent transition-colors overflow-hidden"
    >
      {hasImage ? (
        /* ── Photo header ── */
        <GuideCardImage slug={guide.slug} alt={guide.hero_alt!} />
      ) : (
        /* ── Emoji fallback (no image in manifest) ── */
        <div className="flex h-20 items-center justify-center bg-surface-alt rounded-t-2xl">
          <span className="text-4xl">{guide.icon}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          {!hasImage && <span className="text-2xl">{guide.icon}</span>}
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
      </div>
    </Link>
  )
}
