import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getGuide, getGuides, getGuideSlugs } from '@/lib/guides'
import { mdxComponents } from '@/components/guides/mdx-components'
import { GuideCard } from '@/components/guides/GuideCard'
import { BackButton } from '@/components/ui/BackButton'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = await getLangServer()
  const guide = getGuide(slug, lang)
  if (!guide) return {}
  return { title: `${guide.meta.title} — pundo` }
}

export function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }))
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params
  const lang = await getLangServer()
  const tr = t(lang)
  const guide = getGuide(slug, lang)

  if (!guide) notFound()

  const { meta, content } = guide

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
    haustiere: tr.category_haustiere,
    gesundheit: tr.category_gesundheit,
  }

  const allGuides = getGuides(lang)
  const related = allGuides
    .filter((g) => g.category === meta.category && g.slug !== slug)
    .slice(0, 2)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton fallback="/guides" />

      <header className="space-y-2">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          {categoryLabels[meta.category] ?? meta.category}
        </span>
        <h1 className="text-2xl font-bold leading-snug">{meta.title}</h1>
        <p className="text-sm text-gray-400">{tr.guide_readtime(Number(meta.readtime))}</p>
      </header>

      <article className="guide-content max-w-none">
        <MDXRemote
          source={content}
          components={mdxComponents}
          // SECURITY NOTE (audited 2026-04-28, 36 files):
          // blockJS stays false because guides use JSX expression props like
          // <CostTable rows={[...]} /> — enabling blockJS strips those props and
          // components crash on .map() of undefined (renders as 404).
          // blockDangerousJS: true blocks eval/Function/process/require.
          // TRUST BOUNDARY: guides live in content/guides/ (git-only, dev-controlled).
          // Second line of defence: nonce-based CSP blocks inline scripts anyway.
          // INVARIANT: if guides ever become user-editable (CMS/API), set blockJS: true FIRST.
          options={{ blockJS: false, blockDangerousJS: true }}
        />
      </article>

      {related.length > 0 && (
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h2 className="text-base font-semibold">{tr.guide_related}</h2>
          <div className="grid grid-cols-2 gap-3">
            {related.map((g) => (
              <GuideCard
                key={g.slug}
                guide={g}
                href={`/guides/${g.slug}`}
                variant="grid"
                categoryLabel={categoryLabels[g.category] ?? g.category}
                readtimeLabel={tr.guide_readtime(Number(g.readtime))}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
