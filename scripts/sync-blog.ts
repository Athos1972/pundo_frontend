#!/usr/bin/env tsx
/**
 * sync-blog.ts
 *
 * Fetches new posts from the Soro embed API, translates them via the Claude API
 * into all 6 supported languages, and writes MDX files to content/blog/.
 *
 * Usage:
 *   tsx scripts/sync-blog.ts               # only process new posts
 *   tsx scripts/sync-blog.ts --backfill    # also process already-existing en.mdx (re-translate)
 *   tsx scripts/sync-blog.ts --dry-run     # fetch & translate but don't write files
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY   — Claude API key for translation
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
const LANGS = ['de', 'el', 'ru', 'ar', 'he'] as const

const LANG_NAMES: Record<string, string> = {
  de: 'German',
  el: 'Greek',
  ru: 'Russian',
  ar: 'Arabic',
  he: 'Hebrew',
}

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

function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        } else {
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
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
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `# ${stripTags(t)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `## ${stripTags(t)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `### ${stripTags(t)}\n\n`)
    // Bold / italic
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${stripTags(t)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, t) => `_${stripTags(t)}_`)
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${stripTags(text)}](${href})`)
    // Lists
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) =>
      items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, li) => `- ${stripTags(li).trim()}\n`) + '\n'
    )
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
      let i = 0
      return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, li) => `${++i}. ${stripTags(li).trim()}\n`) + '\n'
    })
    // Paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `${stripTags(t).trim()}\n\n`)
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
// Claude translation
// ---------------------------------------------------------------------------

async function translateWithClaude(
  content: string,
  title: string,
  description: string,
  targetLang: string,
  targetLangName: string,
): Promise<{ title: string; description: string; content: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const prompt = `Translate the following blog post from English to ${targetLangName}.

Rules:
- Use natural, idiomatic ${targetLangName} — not a word-for-word translation
- Preserve all Markdown formatting (##, **, _, - lists, etc.) exactly
- Keep proper nouns (Cyprus, Larnaca, Limassol, IBAN, KYC, etc.) as-is
- Keep any URLs, slugs, or technical strings unchanged
- For Arabic and Hebrew: use proper RTL phrasing naturally
- Respond with ONLY a JSON object, no markdown fences:
  {"title":"...","description":"...","content":"..."}

TITLE:
${title}

DESCRIPTION:
${description}

CONTENT:
${content}`

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = await httpsPost(
    'https://api.anthropic.com/v1/messages',
    requestBody,
    {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  )

  const response = JSON.parse(raw) as {
    content: Array<{ type: string; text: string }>
    error?: { message: string }
  }

  if (response.error) throw new Error(`Claude API error: ${response.error.message}`)

  const text = response.content[0]?.text ?? ''
  // Strip potential markdown code fences if model adds them
  const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(jsonStr) as { title: string; description: string; content: string }
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

    // Translate to all other languages
    for (const lang of LANGS) {
      const langPath = path.join(BLOG_DIR, article.slug, `${lang}.mdx`)
      if (fs.existsSync(langPath) && !BACKFILL) {
        console.log(`  ⏭  ${lang}.mdx exists, skipping`)
        continue
      }

      console.log(`  🌐 Translating → ${lang} (${LANG_NAMES[lang]})…`)
      try {
        const translated = await translateWithClaude(
          markdownContent,
          article.title,
          article.excerpt,
          lang,
          LANG_NAMES[lang],
        )

        if (!DRY_RUN) {
          writeMdx(article.slug, lang, translated.title, translated.description, isoDate, article.image, translated.content)
        } else {
          console.log(`  [dry-run] would write ${lang}.mdx for ${article.slug}`)
        }
      } catch (err) {
        console.error(`  ✗ Failed to translate ${article.slug} → ${lang}:`, err)
      }

      // Small delay to avoid rate-limiting
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log('\n✅ sync-blog done')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
