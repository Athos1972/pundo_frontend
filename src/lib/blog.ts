import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type BlogPostMeta = {
  title: string
  description: string
  lang: string
  slug: string
  date: string        // ISO 8601 e.g. "2026-05-17"
  image?: string      // absolute URL of hero image from Soro/Supabase
  published: boolean
}

export type BlogPostContent = {
  meta: BlogPostMeta
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export function getBlogSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((entry) => fs.statSync(path.join(BLOG_DIR, entry)).isDirectory())
}

function readMdxFile(slug: string, lang: string): BlogPostContent | null {
  const filePath = path.join(BLOG_DIR, slug, `${lang}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
  const meta = { ...data, slug } as BlogPostMeta
  if (!meta.published && process.env.NODE_ENV === 'production') return null
  return { meta, content }
}

export function getBlogPost(slug: string, lang: string): BlogPostContent | null {
  // Fallback chain: requested lang → en → de
  return readMdxFile(slug, lang) ?? readMdxFile(slug, 'en') ?? readMdxFile(slug, 'de')
}

export function getBlogPostLanguages(slug: string): string[] {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he']
  return LANGS.filter((lang) =>
    fs.existsSync(path.join(BLOG_DIR, slug, `${lang}.mdx`))
  )
}

/** Returns all published blog posts for a given language, sorted newest first */
export function getBlogPosts(lang: string): BlogPostMeta[] {
  return getBlogSlugs()
    .map((slug) => getBlogPost(slug, lang)?.meta ?? null)
    .filter((m): m is BlogPostMeta => m !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}
