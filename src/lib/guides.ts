import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { hasImageMeta } from './guide-images'

export type GuideMeta = {
  title: string
  description: string
  category: string
  icon: string
  readtime: string
  lang: string
  slug: string
  published: boolean
  hero_alt?: string // when set + manifest has <slug>/hero, page template renders hero automatically
  featured?: boolean // when true + hero_alt set, rendered as full-width hero above the grid
  tags?: string[] // optional taxonomy tags, e.g. ['charity']
  date?: string // optional, ISO 8601 (YYYY-MM-DD) — first publication, maps to Article.datePublished
  updated?: string // optional, ISO 8601 — last content change, maps to Article.dateModified (falls back to date)
}

export type GuideContent = {
  meta: GuideMeta
  content: string
}

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

export function getGuideSlugs(): string[] {
  if (!fs.existsSync(GUIDES_DIR)) return []
  return fs.readdirSync(GUIDES_DIR).filter((entry) => {
    // Underscore-prefixed entries are system/asset dirs (e.g. `_raw/` holds
    // unoptimized source images, `_image-manifest.json` is metadata) — never
    // real guide content. Checked before statSync to skip an extra syscall
    // and to stay robust if such an entry is ever a symlink/special file.
    if (entry.startsWith('_')) return false
    return fs.statSync(path.join(GUIDES_DIR, entry)).isDirectory()
  })
}

function readMdxFile(slug: string, lang: string): GuideContent | null {
  const filePath = path.join(GUIDES_DIR, slug, `${lang}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
  const meta = { ...data, slug } as GuideMeta
  if (!meta.published && process.env.NODE_ENV === 'production') return null
  return { meta, content }
}

export function getGuide(slug: string, lang: string): GuideContent | null {
  const result = readMdxFile(slug, lang) ?? readMdxFile(slug, 'en') ?? readMdxFile(slug, 'de')
  if (result?.meta.hero_alt && !hasImageMeta(`${slug}/hero`)) {
    throw new Error(
      `[guides] Frontmatter has hero_alt but manifest is missing entry '${slug}/hero'. ` +
        `Run \`npm run guides:optimize\`.`,
    )
  }
  return result
}

export function getGuideLanguages(slug: string): string[] {
  const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he']
  return LANGS.filter((lang) => fs.existsSync(path.join(GUIDES_DIR, slug, `${lang}.mdx`)))
}

export function getGuides(lang: string): GuideMeta[] {
  return getGuideSlugs()
    .map((slug) => getGuide(slug, lang)?.meta ?? null)
    .filter((m): m is GuideMeta => m !== null)
}

/** Returns all guides tagged 'charity', sorted by title, with optional limit. */
export function getCharityGuides(lang: string, limit?: number): GuideMeta[] {
  const results = getGuides(lang).filter((m) => m.tags?.includes('charity'))
  return limit != null ? results.slice(0, limit) : results
}

// Returns the first guide with featured: true in the exact requested language.
// No language fallback by design — hero is hidden when no exact-language MDX exists.
export function getFeaturedGuide(lang: string): GuideMeta | null {
  return getGuideSlugs()
    .map((slug) => readMdxFile(slug, lang)?.meta ?? null)
    .filter((m): m is GuideMeta => m !== null && m.featured === true)[0] ?? null
}
