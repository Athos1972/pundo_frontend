import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Image from 'next/image'
import type { Lang } from '@/lib/lang'
import { LANGS } from '@/lib/lang'
import { t } from '@/lib/translations'
import { truncateTitle } from '@/lib/seo/metadata-defaults'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { getBlogPost, getBlogSlugs } from '@/lib/blog'
import { localePath, buildHreflang } from '@/lib/routing'
import { mdxComponents } from '@/components/guides/mdx-components'
import { safeJson } from '@/lib/structured-data'
import { BackButton } from '@/components/ui/BackButton'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface Props {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const post = getBlogPost(slug, lang)
  if (!post) return {}

  const { title, description, date, image } = post.meta
  const siteUrl = 'https://pundo.cy'
  const canonicalUrl = `${siteUrl}/${lang}/blog/${slug}`

  const truncatedTitle = truncateTitle(title, { max: 60, reserved: Array.from(' — pundo').length })
  const pageTitle = `${truncatedTitle} — pundo`

  const ogImageUrl = image ?? `${siteUrl}/og/shop-fallback-default.jpg`
  const og = buildCompleteOpenGraph({
    title: pageTitle,
    description: description ?? '',
    url: canonicalUrl,
    type: 'article',
    locale: lang,
    siteName: 'Pundo',
    image: { url: ogImageUrl, width: 1200, height: 630, alt: title },
    publishedTime: date,
  })

  return {
    title: { absolute: pageTitle },
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflang(siteUrl, `/blog/${slug}`),
    },
    openGraph: og.openGraph,
    twitter: og.twitter,
    ...(og.other ? { other: og.other } : {}),
  }
}

export function generateStaticParams() {
  return LANGS.flatMap(lang =>
    getBlogSlugs().map(slug => ({ lang, slug }))
  )
}

export default async function BlogPostPage({ params }: Props) {
  const { lang, slug } = await params as { lang: Lang; slug: string }
  const tr = t(lang)
  const post = getBlogPost(slug, lang)

  if (!post) notFound()

  const { meta, content } = post

  const formattedDate = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(meta.date))

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: meta.title,
            description: meta.description,
            datePublished: meta.date,
            ...(meta.image ? { image: meta.image } : {}),
            inLanguage: lang,
            author: { '@type': 'Organization', name: 'Pundo', url: 'https://pundo.cy' },
            publisher: {
              '@type': 'Organization',
              name: 'Pundo',
              url: 'https://pundo.cy',
              logo: { '@type': 'ImageObject', url: 'https://pundo.cy/brands/pundo/logo.png' },
            },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Blog', item: 'https://pundo.cy/blog' },
                { '@type': 'ListItem', position: 2, name: meta.title },
              ],
            },
          }),
        }}
      />

      <Breadcrumb items={[
        { label: tr.home, href: localePath(lang, '/') },
        { label: tr.blog_index_title, href: localePath(lang, '/blog') },
        { label: meta.title },
      ]} />
      <BackButton fallback={localePath(lang, '/blog')} />

      <header className="space-y-2">
        <p className="text-sm text-gray-400">
          {tr.blog_published} · {formattedDate}
        </p>
        <h1 className="text-2xl font-bold leading-snug">{meta.title}</h1>
      </header>

      {meta.image && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
          <Image
            src={meta.image}
            alt={meta.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}

      <article className="guide-content max-w-none">
        <MDXRemote
          source={content}
          components={mdxComponents}
          options={{ blockJS: true, blockDangerousJS: true }}
        />
      </article>
    </main>
  )
}
