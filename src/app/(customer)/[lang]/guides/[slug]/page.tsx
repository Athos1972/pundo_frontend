import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import type { Lang } from '@/lib/lang'
import { LANGS } from '@/lib/lang'
import { t } from '@/lib/translations'
import { truncateTitle } from '@/lib/seo/metadata-defaults'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { getGuide, getGuides, getGuideSlugs } from '@/lib/guides'
import { getImageMeta, hasImageMeta } from '@/lib/guide-images'
import { localePath, buildHreflang } from '@/lib/routing'
import { mdxComponents } from '@/components/guides/mdx-components'
import { GuideHeroImage } from '@/components/guides/GuideHeroImage'
import { GuideCard } from '@/components/guides/GuideCard'
import { BackButton } from '@/components/ui/BackButton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { buildArticleSchema, safeJson } from '@/lib/structured-data'

interface Props {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const guide = getGuide(slug, lang)
  if (!guide) return {}

  const { title, description } = guide.meta
  const siteUrl = 'https://pundo.cy'
  const canonicalUrl = `${siteUrl}/${lang}/guides/${slug}`

  // T7/AC-37: Truncate title to fit 60-char limit with " — pundo" suffix (8 chars)
  const truncatedTitle = truncateTitle(title, { max: 60, reserved: Array.from(' — pundo').length })
  const pageTitle = `${truncatedTitle} — pundo`

  // Build a guaranteed-complete OG block
  const ogImageUrl = `${siteUrl}/og/shop-fallback-default.jpg`
  const og = buildCompleteOpenGraph({
    title: pageTitle,
    description: description ?? '',
    url: canonicalUrl,
    type: 'article',
    locale: lang,
    siteName: 'Pundo',
    image: { url: ogImageUrl, width: 1200, height: 630, alt: title },
    publishedTime: guide.meta.date,
  })

  return {
    // Use absolute title to bypass the layout template (which would append " | Pundo"
    // and push the total over 60 chars — the truncation already reserves for that).
    title: { absolute: pageTitle },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflang(siteUrl, `/guides/${slug}`),
    },
    openGraph: og.openGraph,
    twitter: og.twitter,
    ...(og.other ? { other: og.other } : {}),
  }
}

export function generateStaticParams() {
  return LANGS.flatMap(lang =>
    getGuideSlugs().map(slug => ({ lang, slug }))
  )
}

export default async function GuideDetailPage({ params }: Props) {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const tr = t(lang)
  const guide = getGuide(slug, lang)

  if (!guide) notFound()

  const { meta, content } = guide

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
    haustiere: tr.category_haustiere,
    gesundheit: tr.category_gesundheit,
    wohnen: tr.category_wohnen,
    finanzen: tr.category_finanzen,
    plattform: tr.category_plattform,
    start: tr.category_start,
    gemeinschaft: tr.category_gemeinschaft,
  }

  const allGuides = getGuides(lang)
  const related = allGuides
    .filter((g) => g.category === meta.category && g.slug !== slug)
    .slice(0, 2)

  const siteUrl = 'https://pundo.cy'
  const canonicalUrl = `${siteUrl}/${lang}/guides/${slug}`

  // image: Hero-Bild wenn vorhanden (dieselbe Quelle wie <GuideHeroImage>),
  // sonst Brand-Fallback (identisch zum OG-Fallback in generateMetadata).
  const heroWidths = meta.hero_alt && hasImageMeta(`${slug}/hero`)
    ? getImageMeta(`${slug}/hero`).widths
    : null
  const articleImage = heroWidths
    ? `${siteUrl}/images/guides/${slug}-hero-${heroWidths[heroWidths.length - 1]}.webp`
    : `${siteUrl}/og/shop-fallback-default.jpg`

  const articleSchema = buildArticleSchema({
    title: meta.title,
    description: meta.description,
    lang,
    canonicalUrl,
    image: articleImage,
    datePublished: meta.date,
    dateModified: meta.updated ?? meta.date,
    siteUrl,
  })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(articleSchema) }}
      />
      {/* breadcrumb intentionally omitted from Article schema — standalone
          <Breadcrumb> component below emits a correct, separate BreadcrumbList
          schema with absolute URLs (AC-2 fix, analog Blog page). */}
      <Breadcrumb items={[
        { label: tr.home, href: localePath(lang, '/') },
        { label: tr.nav_guides, href: localePath(lang, '/guides') },
        { label: meta.title },
      ]} />
      <BackButton fallback={localePath(lang, '/guides')} />

      <header className="space-y-2">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          {categoryLabels[meta.category] ?? meta.category}
        </span>
        <h1 className="text-2xl font-bold leading-snug">{meta.title}</h1>
        <p className="text-sm text-gray-400">{tr.guide_readtime(Number(meta.readtime))}</p>
      </header>

      {meta.hero_alt && <GuideHeroImage slug={meta.slug} alt={meta.hero_alt} priority />}

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
                href={localePath(lang, `/guides/${g.slug}`)}
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
