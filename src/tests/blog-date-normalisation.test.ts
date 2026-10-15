import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// YAML parses an unquoted `date: 2026-05-17` into a Date object; the list sort used to call
// localeCompare on it and the whole blog list crashed.
describe('blog date normalisation', () => {
  let tmp: string

  function post(slug: string, dateLine: string) {
    const dir = path.join(tmp, 'content', 'blog', slug)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'en.mdx'),
      `---\ntitle: T ${slug}\ndescription: d\nlang: en\n${dateLine}\npublished: true\n---\nBody\n`,
    )
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-'))
    vi.spyOn(process, 'cwd').mockReturnValue(tmp)
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('lists posts with unquoted, quoted and timestamped dates, sorted newest first, all as ISO strings', async () => {
    post('a-unquoted', 'date: 2026-05-17')
    post('b-quoted', 'date: "2026-06-01"')
    post('c-timestamp', 'date: 2026-04-01T10:30:00Z')
    const { getBlogPosts } = await import('@/lib/blog')
    const posts = getBlogPosts('en')
    expect(posts.map((p) => p.slug)).toEqual(['b-quoted', 'a-unquoted', 'c-timestamp'])
    for (const p of posts) expect(typeof p.date).toBe('string')
    expect(posts[1].date.startsWith('2026-05-17')).toBe(true)
    expect(posts[2].date).toBe('2026-04-01T10:30:00.000Z')
  })

  it('getBlogPost also returns a string date', async () => {
    post('x', 'date: 2026-05-17')
    const { getBlogPost } = await import('@/lib/blog')
    expect(typeof getBlogPost('x', 'en')?.meta.date).toBe('string')
  })

  it('a missing or garbage date does not break the list', async () => {
    post('ok', 'date: 2026-05-17')
    post('nodate', 'foo: bar')
    post('junk', 'date: not-a-date')
    const { getBlogPosts } = await import('@/lib/blog')
    const posts = getBlogPosts('en')
    expect(posts).toHaveLength(3)
    expect(posts[0].slug).toBe('ok')
    for (const p of posts) expect(typeof p.date).toBe('string')
  })
})
