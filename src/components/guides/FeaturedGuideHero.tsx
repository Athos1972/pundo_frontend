import Link from 'next/link'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import type { GuideMeta } from '@/lib/guides'
import { GuideHeroImage } from './GuideHeroImage'

type Props = {
  guide: GuideMeta
  lang: string
  badgeLabel: string
  ctaLabel: string
}

export function FeaturedGuideHero({ guide, lang, badgeLabel, ctaLabel }: Props) {
  return (
    <Link
      href={localePath(lang as Lang, `/guides/${guide.slug}`)}
      className="block rounded-2xl border border-border bg-surface overflow-hidden hover:border-accent transition-colors"
    >
      <div className="sm:flex sm:flex-row rtl:sm:flex-row-reverse">
        <div className="sm:w-2/5 shrink-0 overflow-hidden">
          <GuideHeroImage
            slug={guide.slug}
            alt={guide.hero_alt ?? guide.title}
            priority
          />
        </div>
        <div className="p-4 flex flex-col gap-2 justify-center">
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent w-fit">
            {badgeLabel}
          </span>
          <p className="font-bold text-lg leading-snug text-text">{guide.title}</p>
          <p className="text-sm text-text-muted line-clamp-2">{guide.description}</p>
          <p className="text-sm font-medium text-accent">{ctaLabel}</p>
        </div>
      </div>
    </Link>
  )
}
