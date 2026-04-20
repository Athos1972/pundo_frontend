import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type GuideMeta = {
  title: string
  description: string
  category: string
  icon: string
  readtime: string
  lang: string
  slug: string
  published: boolean
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
  return readMdxFile(slug, lang) ?? readMdxFile(slug, 'en') ?? readMdxFile(slug, 'de')
}

export function getGuides(lang: string): GuideMeta[] {
  return getGuideSlugs()
    .map((slug) => getGuide(slug, lang)?.meta ?? null)
    .filter((m): m is GuideMeta => m !== null)
}
