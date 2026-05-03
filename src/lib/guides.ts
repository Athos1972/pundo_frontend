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
}

export type GuideContent = {
  meta: GuideMeta
  content: string
}

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

export function getGuideSlugs(): string[] {
  if (!fs.existsSync(GUIDES_DIR)) return []
  return fs.readdirSync(GUIDES_DIR).filter((entry) =>
    fs.statSync(path.join(GUIDES_DIR, entry)).isDirectory()
  )
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
