import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getBlogPosts } from '@/lib/blog'
import { localePath } from '@/lib/routing'

import { BackButton } from '@/components/ui/BackButton'
import { tSeo } from '@/lib/translations'
import { safeJson } from '@/lib/structured-data'
import { getSiteUrl } from '@/lib/seo'
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata'
import { getBrandFromHeaders } from '@/config/brands'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const brand = await getBrandFromHeaders()
  const s = tSeo(lang)
  return buildStaticPageMetadata({
    lang,
    path: '/blog',
    title: s.seo_blog_title,
    description: s.seo_blog_desc,
    siteName: brand.name,
  })
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const posts = getBlogPosts(lang)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Pundo Blog',
            url: `${getSiteUrl()}/${lang}/blog`,
            publisher: { '@type': 'Organization', name: 'Pundo', url: getSiteUrl() },
            blogPost: posts.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              description: p.description,
              datePublished: p.date,
              url: `${getSiteUrl()}/${lang}/blog/${p.slug}`,
              ...(p.image ? { image: p.image } : {}),
            })),
          }),
        }}
      />

      <BackButton />

      <div>
        <h1 className="text-2xl font-bold">{tr.blog_index_title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{tr.blog_index_subtitle}</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">—</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={localePath(lang, `/blog/${post.slug}`)}
                className="group flex gap-4 rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                {post.image && (
                  <div className="relative w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{post.date}</p>
                    <h2 className="text-sm font-semibold leading-snug group-hover:text-accent line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.description}</p>
                  </div>
                  <span className="text-xs text-accent mt-2">{tr.blog_read_more} →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
