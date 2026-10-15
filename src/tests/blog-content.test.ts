import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'

// In-memory content/blog tree: { 'slug/lang.mdx': file content }
const files = new Map<string, string>()
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const abs = (rel: string) => path.join(BLOG_DIR, rel)
const dirs = () => new Set([BLOG_DIR, ...[...files.keys()].map((k) => abs(k.split('/')[0]))])

vi.mock('fs', () => {
  const api = {
    existsSync: (p: string) => p === BLOG_DIR ? exists.blogDir : files.has(path.relative(BLOG_DIR, p)),
    readdirSync: () => [...new Set([...files.keys()].map((k) => k.split('/')[0])), 'README.md'],
    statSync: (p: string) => ({ isDirectory: () => dirs().has(p) }),
    readFileSync: (p: string) => files.get(path.relative(BLOG_DIR, p)) ?? '',
  }
  return { default: api, ...api }
})
const exists = { blogDir: true }

import { getBlogSlugs, getBlogPost, getBlogPostLanguages, getBlogPosts } from '@/lib/blog'

const mdx = (title: string, date: string, published = true, extra = '') =>
  `---\ntitle: ${title}\ndescription: d\nlang: x\ndate: '${date}'\npublished: ${published}\n${extra}---\nBody of ${title}\n`

beforeEach(() => {
  files.clear()
  exists.blogDir = true
  vi.unstubAllEnvs()
})
afterEach(() => vi.unstubAllEnvs())

describe('blog content loader', () => {
  it('lists only directories as slugs, and nothing when the folder is missing', () => {
    files.set('post-a/en.mdx', mdx('A', '2026-01-01'))
    expect(getBlogSlugs()).toEqual(['post-a'])   // README.md is a file, not a post
    exists.blogDir = false
    expect(getBlogSlugs()).toEqual([])
  })

  it('returns frontmatter + body and injects the slug', () => {
    files.set('post-a/de.mdx', mdx('Titel', '2026-01-01'))
    const post = getBlogPost('post-a', 'de')!
    expect(post.meta).toMatchObject({ title: 'Titel', slug: 'post-a' })
    expect(post.content.trim()).toBe('Body of Titel')
  })

  it('falls back lang -> en -> de, then null', () => {
    files.set('p/en.mdx', mdx('EN', '2026-01-01'))
    files.set('q/de.mdx', mdx('DE', '2026-01-01'))
    expect(getBlogPost('p', 'ru')!.meta.title).toBe('EN')
    expect(getBlogPost('q', 'ru')!.meta.title).toBe('DE')
    expect(getBlogPost('nope', 'ru')).toBeNull()
  })

  it('unpublished posts are visible in development but hidden in production', () => {
    files.set('draft/en.mdx', mdx('Draft', '2026-01-01', false))
    vi.stubEnv('NODE_ENV', 'development')
    expect(getBlogPost('draft', 'en')).not.toBeNull()
    vi.stubEnv('NODE_ENV', 'production')
    expect(getBlogPost('draft', 'en')).toBeNull()
  })

  it('reports which languages exist for a post', () => {
    files.set('p/en.mdx', mdx('EN', '2026-01-01'))
    files.set('p/ar.mdx', mdx('AR', '2026-01-01'))
    expect(getBlogPostLanguages('p')).toEqual(['en', 'ar'])
  })

  it('lists posts newest first and skips hidden ones', () => {
    vi.stubEnv('NODE_ENV', 'production')
    files.set('old/en.mdx', mdx('Old', '2025-01-01'))
    files.set('new/en.mdx', mdx('New', '2026-06-01'))
    files.set('hidden/en.mdx', mdx('Hidden', '2027-01-01', false))
    expect(getBlogPosts('en').map((p) => p.title)).toEqual(['New', 'Old'])
  })
})
