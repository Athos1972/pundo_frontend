// F8960: Staleness-Logik der Team-Videos (scripts/video-staleness.mjs) ohne echtes Git + Konsistenz registry.json <-> system-admin-help.ts.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error reines .mjs ohne Typen
import { parseGitLog, evaluateEntry, formatTable, hasStale } from '../../scripts/video-staleness.mjs'
import { HELP_TOPICS, HELP_TOPIC_IDS } from '@/lib/system-admin-help'

const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'video', 'registry.json'), 'utf8')) as Array<{
  slug: string; topic: string; youtubeId: string; recordedAtCommit: string; recordedAt: string; touches: string[]
}>

const GIT = 'abc1234 fix(admin): Shop-Form\n\n  def5678 feat(admin): neuer Filter  \n1112223 chore: a\n4445556 chore: b\n'

describe('parseGitLog', () => {
  it('parses hash and subject, ignores blank lines', () => {
    expect(parseGitLog(GIT)).toHaveLength(4)
    expect(parseGitLog(GIT)[1]).toEqual({ hash: 'def5678', subject: 'feat(admin): neuer Filter' })
  })
  it('handles empty and hash-only input', () => {
    expect(parseGitLog('')).toEqual([])
    expect(parseGitLog(undefined)).toEqual([])
    expect(parseGitLog('abc1234')).toEqual([{ hash: 'abc1234', subject: '' }])
  })
})

describe('evaluateEntry', () => {
  const entry = { slug: 'team-shops', topic: 'shops' }
  it('is "aktuell" without commits', () => {
    expect(evaluateEntry(entry, '')).toMatchObject({ count: 0, status: 'aktuell', recent: [] })
  })
  it('is "pruefen" with commits and lists the latest 3 subjects', () => {
    const r = evaluateEntry(entry, GIT)
    expect(r.status).toBe('pruefen')
    expect(r.count).toBe(4)
    expect(r.recent).toEqual(['fix(admin): Shop-Form', 'feat(admin): neuer Filter', 'chore: a'])
  })
  it('hasStale / formatTable', () => {
    const rs = [evaluateEntry(entry, ''), evaluateEntry({ slug: 'team-crm', topic: 'crm' }, GIT)]
    expect(hasStale(rs)).toBe(true)
    expect(hasStale([rs[0]])).toBe(false)
    const table = formatTable(rs)
    expect(table).toContain('team-shops')
    expect(table).toContain('pruefen')
  })
})

describe('video/registry.json', () => {
  it('has one entry per help topic that has a video, with matching topic and YouTube id', () => {
    // written guides (noVideo, e.g. api-keys) have no video and therefore no registry entry
    const withVideo = HELP_TOPICS.filter((t) => !t.noVideo).map((t) => t.id)
    expect(registry.map((e) => e.topic).sort()).toEqual([...withVideo].sort())
    expect(HELP_TOPIC_IDS.length).toBeGreaterThanOrEqual(withVideo.length)
    for (const e of registry) {
      const topic = HELP_TOPICS.find((t) => t.id === e.topic)
      expect(topic, e.topic).toBeDefined()
      expect(e.youtubeId).toBe(topic!.videoId ?? '')   // empty until the upload (no videoId in the help topic either)
      expect(e.slug).toBe(`team-${e.topic}`)
      expect(e.recordedAtCommit).toMatch(/^[0-9a-f]{40}$/)
      expect(e.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.touches.length).toBeGreaterThan(0)
    }
  })
  it('touches exist and exclude translations and video/**', () => {
    for (const e of registry) for (const t of e.touches) {
      expect(fs.existsSync(path.join(process.cwd(), t)), t).toBe(true)
      expect(t).not.toMatch(/translations|^video\//)
    }
  })
})
