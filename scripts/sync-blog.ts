#!/usr/bin/env tsx
/**
 * sync-blog.ts
 *
 * Fetches new posts from the Soro embed API and writes en.mdx files to content/blog/.
 * Translation into all other languages is handled by the Cowork scheduled task
 * (Claude reads en.mdx and writes de/ru/el/ar/he.mdx directly — no API key needed).
 *
 * Usage:
 *   tsx scripts/sync-blog.ts               # only process new posts
 *   tsx scripts/sync-blog.ts --backfill    # re-fetch already-existing en.mdx
 *   tsx scripts/sync-blog.ts --dry-run     # fetch but don't write files
 *
 * Optional env vars:
 *   SORO_SITE_ID        — overrides the hard-coded Soro site ID
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SORO_SITE_ID = process.env.SORO_SITE_ID ?? '8c458bd7-a4f3-4174-9c98-0dcf90178cc2'
const SORO_EMBED_BASE = `https://app.trysoro.com/api/embed/${SORO_SITE_ID}`
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

const args = process.argv.slice(2)
const BACKFILL = args.includes('--backfill')
const DRY_RUN = args.includes('--dry-run')

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve(body))
    }).on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// Soro API
// ---------------------------------------------------------------------------

interface SoroArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  date: string      // e.g. "May 17, 2026"
  isoDate: string   // e.g. "2026-05-17T04:18:30.81+00:00"
  image: string
  content: null
}

async function fetchArticleList(): Promise<SoroArticle[]> {
  const js = await httpGet(SORO_EMBED_BASE)
  const match = js.match(/var SORO_ARTICLES\s*=\s*(\[[\s\S]*?\]);/)
  if (!match) throw new Error('Could not find SORO_ARTICLES in embed script')
  return JSON.parse(match[1]) as SoroArticle[]
}

async function fetchArticleContent(articleId: string): Promise<string> {
  const url = `${SORO_EMBED_BASE}/article/${articleId}`
  const json = await httpGet(url)
  const data = JSON.parse(json) as { content: string }
  return data.content
}

// ---------------------------------------------------------------------------
// HTML → Markdown
// ---------------------------------------------------------------------------

function htmlToMarkdown(html: string): string {
  return html
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m: string, t: string) => `# ${stripTags(t)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m: string, t: string) => `## ${stripTags(t)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m: string, t: string) => `### ${stripTags(t)}\n\n`)
    // Bold / italic
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_m: string, t: string) => `**${stripTags(t)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_m: string, t: string) => `_${stripTags(t)}_`)
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m: string, href: string, text: string) => `[${stripTags(text)}](${href})`)
    // Lists
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m: string, items: string) =>
      items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_mi: string, li: string) => `- ${stripTags(li).trim()}\n`) + '\n'
    )
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m: string, items: string) => {
      let i = 0
      return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_mi: string, li: string) => `${++i}. ${stripTags(li).trim()}\n`) + '\n'
    })
    // Paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m: string, t: string) => `${stripTags(t).trim()}\n\n`)
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

// ---------------------------------------------------------------------------
// MDX file writer
// ---------------------------------------------------------------------------

function writeMdx(
  slug: string,
  lang: string,
  title: string,
  description: string,
  date: string,
  image: string,
  content: string,
): void {
  const dir = path.join(BLOG_DIR, slug)
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${lang}.mdx`)
  const frontmatter = [
    '---',
    `title: '${title.replace(/'/g, "''")}'`,
    `description: >-`,
    `  ${description.replace(/\n/g, '\n  ')}`,
    `lang: ${lang}`,
    `date: '${date}'`,
    `slug: ${slug}`,
    ...(image ? [`image: '${image}'`] : []),
    `published: true`,
    '---',
    '',
  ].join('\n')

  fs.writeFileSync(filePath, frontmatter + content + '\n')
  console.log(`  ✓ wrote ${lang}.mdx`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔄 Fetching Soro article list…')
  const articles = await fetchArticleList()
  console.log(`   Found ${articles.length} article(s)`)

  fs.mkdirSync(BLOG_DIR, { recursive: true })

  for (const article of articles) {
    const enPath = path.join(BLOG_DIR, article.slug, 'en.mdx')
    const isNew = !fs.existsSync(enPath)

    if (!isNew && !BACKFILL) {
      console.log(`⏭  Skipping ${article.slug} (already exists)`)
      continue
    }

    console.log(`\n📝 Processing: ${article.slug}`)

    // Fetch HTML content
    const htmlContent = await fetchArticleContent(article.id)

    // Convert to Markdown
    const markdownContent = htmlToMarkdown(htmlContent)

    // ISO date (just the date part)
    const isoDate = article.isoDate.split('T')[0]

    if (!DRY_RUN) {
      writeMdx(article.slug, 'en', article.title, article.excerpt, isoDate, article.image, markdownContent)
    } else {
      console.log(`  [dry-run] would write en.mdx for ${article.slug}`)
    }
  }

  console.log('\n✅ sync-blog done')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
