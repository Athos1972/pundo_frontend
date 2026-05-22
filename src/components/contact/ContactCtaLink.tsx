import Link from 'next/link'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'

interface Props {
  lang: Lang
  variant: 'inline' | 'block'
}

export function ContactCtaLink({ lang, variant }: Props) {
  const tr = t(lang)
  const href = localePath(lang, '/contact')

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        className="text-sm text-accent underline hover:no-underline"
      >
        {tr.contact_cta_inline}
      </Link>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-3">
      <p className="text-base font-semibold text-text">{tr.contact_cta_empty_title}</p>
      <p className="text-sm text-text-muted">{tr.contact_cta_empty_results}</p>
      <Link
        href={href}
        className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
      >
        {tr.contact_cta_empty_action}
      </Link>
    </div>
  )
}
