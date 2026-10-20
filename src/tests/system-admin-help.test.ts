// F8960 AK 8 + 9: help data source, route existence, EN/EL content parity
import { describe, it, expect } from 'vitest'
import {
  HELP_TOPICS, HELP_TOPIC_IDS, getHelpTopic, isValidVideoId, youtubeWatchUrl, formatDuration,
} from '@/lib/system-admin-help'
import { HELP_CONTENT, helpLang } from '@/lib/system-admin-help-content'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { adminRouteExists } from './helpers/admin-routes'

const GREEK = /[Ͱ-Ͽ]/
// proper nouns / abbreviations that are identical in both languages on purpose
const SAME_ALLOWED = new Set(['CRM'])

describe('help topics (data source)', () => {
  it('has the topics in the agreed order (3b between shops and products)', () => {
    // the agreed core order; later topics are appended at the end, so the topic count is deliberately not hard-coded
    const core = ['admin-tour', 'claims-owners', 'shops', 'catalog-basics', 'products', 'translations', 'crm']
    expect(HELP_TOPICS.map((t) => t.id).slice(0, core.length)).toEqual(core)
    expect(HELP_TOPICS.map((t) => t.number).slice(0, core.length)).toEqual(['1', '2', '3', '3b', '4', '4b', '5'])
    // topics 6-8 follow, appended in this order (later topics go to the end; the total is deliberately not hard-coded)
    const later = HELP_TOPICS.slice(core.length)
    expect(later.slice(0, 3).map((t) => t.id)).toEqual(['moderation', 'catalog-quality', 'api-keys'])
    expect(later.slice(0, 3).map((t) => t.number)).toEqual(['6', '7', '8'])
    expect(HELP_TOPICS.map((t) => t.id)).toEqual([...HELP_TOPIC_IDS])
  })

  it('has unique ids and strictly ascending, unique order', () => {
    expect(new Set(HELP_TOPICS.map((t) => t.id)).size).toBe(HELP_TOPICS.length)
    const orders = HELP_TOPICS.map((t) => t.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })

  it('every admin link is a static /admin/ route that exists in the portal', () => {
    for (const t of HELP_TOPICS) {
      expect(t.adminLinks.length).toBeGreaterThanOrEqual(1)
      for (const l of t.adminLinks) {
        expect(l.href.startsWith('/admin/')).toBe(true)
        expect(l.href).not.toMatch(/[?#[]/)
        expect(adminRouteExists(l.href), `${t.id}: ${l.href}`).toBe(true)
        const tr = tSysAdmin('en') as unknown as Record<string, string>
        expect(tr[l.navKey], `${t.id}: ${l.navKey}`).toBeTruthy()
      }
    }
  })

  it('every videoId (if set) has 11 chars [A-Za-z0-9_-]', () => {
    for (const t of HELP_TOPICS) {
      if (t.videoId !== undefined) expect(isValidVideoId(t.videoId), `${t.id}: ${t.videoId}`).toBe(true)
    }
  })

  it('isValidVideoId rejects malformed ids', () => {
    expect(isValidVideoId('abcDEF12345')).toBe(true)
    expect(isValidVideoId('abc_DEF-123')).toBe(true)
    expect(isValidVideoId('abcDEF1234')).toBe(false) // 10
    expect(isValidVideoId('abcDEF123456')).toBe(false) // 12
    expect(isValidVideoId('abcDEF1234?')).toBe(false)
    expect(isValidVideoId('')).toBe(false)
  })

  it('builds the watch URL and the duration', () => {
    expect(youtubeWatchUrl('abcDEF12345')).toBe('https://www.youtube.com/watch?v=abcDEF12345')
    expect(formatDuration(185)).toBe('3:05')
    expect(formatDuration(60)).toBe('1:00')
    expect(getHelpTopic('crm')?.id).toBe('crm')
    expect(getHelpTopic('nope')).toBeUndefined()
  })
})

describe('adminRouteExists (helper)', () => {
  it('finds portal pages and rejects everything else', () => {
    expect(adminRouteExists('/admin/dashboard')).toBe(true)
    expect(adminRouteExists('/admin/crm/contacts')).toBe(true)
    expect(adminRouteExists('/admin/does-not-exist')).toBe(false)
    expect(adminRouteExists('/admin/login')).toBe(false) // outside (portal)
    expect(adminRouteExists('/admin/crm/contacts/[id]')).toBe(false) // dynamic segment is no literal match
    expect(adminRouteExists('/shops')).toBe(false)
  })
})

describe('help content (EN + EL)', () => {
  it('has content for every topic in both languages', () => {
    for (const id of HELP_TOPIC_IDS) {
      for (const l of ['en', 'el'] as const) {
        const c = HELP_CONTENT[id]?.[l]
        expect(c, `${id}.${l}`).toBeTruthy()
        expect(c.title.trim()).not.toBe('')
        expect(c.summary.trim()).not.toBe('')
        expect(c.steps.length).toBeGreaterThanOrEqual(1)
        c.steps.forEach((s) => expect(s.trim()).not.toBe(''))
      }
    }
  })

  it('keeps EN and EL in step: same number of steps and notes, same note kinds', () => {
    for (const id of HELP_TOPIC_IDS) {
      const { en, el } = HELP_CONTENT[id]
      expect(el.steps.length, `${id} steps`).toBe(en.steps.length)
      expect(el.notes?.length ?? 0, `${id} notes`).toBe(en.notes?.length ?? 0)
      expect(el.notes?.map((n) => n.kind)).toEqual(en.notes?.map((n) => n.kind))
      expect(Boolean(el.intro), `${id} intro`).toBe(Boolean(en.intro))
    }
  })

  it('EL uses Greek script (title, summary, every step and note) and is not a copy of EN', () => {
    for (const id of HELP_TOPIC_IDS) {
      const { en, el } = HELP_CONTENT[id]
      const greekParts = [el.title, el.summary, ...(el.intro ? [el.intro] : []), ...el.steps, ...(el.notes ?? []).map((n) => n.text)]
      greekParts.filter((p) => !SAME_ALLOWED.has(p)).forEach((p) => expect(p, `${id}: ${p.slice(0, 40)}`).toMatch(GREEK))
      const pairs: [string, string][] = [[en.title, el.title], [en.summary, el.summary], ...en.steps.map((s, i) => [s, el.steps[i]] as [string, string])]
      pairs.forEach(([a, b]) => { if (!SAME_ALLOWED.has(a)) expect(b).not.toBe(a) })
    }
  })

  it('topic 4b states the verified translation facts', () => {
    const en = HELP_CONTENT.translations.en
    const text = [...en.steps, ...(en.notes ?? []).map((n) => n.text)].join(' ')
    expect(text).toMatch(/6 languages/)
    expect(text).toMatch(/never overwrites a language version/)
    expect(text).toMatch(/edit every language version/)
    expect(text).toMatch(/seed_taxonomy\.py/)
    expect(en.notes?.some((n) => n.kind === 'warning')).toBe(true)
  })

  it('topic 3b covers categories and brands with the slug, the duplicate check and the seed warning', () => {
    const en = HELP_CONTENT['catalog-basics'].en
    const text = [...en.steps, ...(en.notes ?? []).map((n) => n.text)].join(' ')
    expect(text).toMatch(/slug/)
    expect(text).toMatch(/duplicate/i)
    expect(text).toMatch(/seed_taxonomy\.py/)
    expect(en.notes?.filter((n) => n.kind === 'warning').length).toBeGreaterThanOrEqual(1)
    expect(HELP_CONTENT.products.en.steps.join(' ')).toMatch(/Categories and brands/)
    const topic = getHelpTopic('catalog-basics')!
    expect(topic.videoId).toBeUndefined()
    expect(topic.adminLinks.map((l) => l.href)).toEqual(['/admin/categories', '/admin/brands'])
  })

  it('topic 6 covers review moderation and social-link rules with the delete-free and domain-wide warnings', () => {
    const en = HELP_CONTENT.moderation.en
    const text = [...en.steps, ...(en.notes ?? []).map((n) => n.text)].join(' ')
    for (const word of ['Reported', 'Hide review', 'Restore review', 'Audit log', 'Social-Link Rules', 'Add rule', 'Delete']) expect(text).toContain(word)
    expect(text).toMatch(/never delete/)
    expect(text).toMatch(/whole main domain/)
    expect(text).toMatch(/blog\.example\.com is stored as example\.com/)
    expect(en.notes?.filter((n) => n.kind === 'warning').length).toBeGreaterThanOrEqual(1)
    // UI words used in the SOP are the real labels
    const tr = tSysAdmin('en') as unknown as Record<string, string>
    for (const key of ['rev_filter_reported', 'rev_action_hide', 'rev_action_restore', 'rev_audit_link', 'nav_social_link_rules', 'slr_new']) expect(text).toContain(tr[key])
    const topic = getHelpTopic('moderation')!
    expect(topic.videoId).toBeUndefined()
    expect(topic.adminLinks.map((l) => l.href)).toEqual(['/admin/reviews', '/admin/social-link-rules'])
  })

  it('topic 7 covers attribute definitions and service mappings with the delete/rename and auto-assign warnings', () => {
    const en = HELP_CONTENT['catalog-quality'].en
    const text = [...en.steps, ...(en.notes ?? []).map((n) => n.text)].join(' ')
    for (const word of ['Attribute Defs', 'Manage defs', 'Add new', 'Options (comma-separated)', 'Service Catalog', 'Mapping Gaps', 'Add mapping', 'Item ID', 'Auto-assign']) expect(text).toContain(word)
    expect(text).toMatch(/inherit/)
    expect(text).toMatch(/stay in the database under the old key/)
    expect(text).toMatch(/does not create empty values for products that are already in the category/)
    expect(text).toMatch(/removes nothing from shops that already received the service/)
    expect(en.notes?.filter((n) => n.kind === 'warning').length).toBeGreaterThanOrEqual(2)
    // UI words used in the SOP are the real labels
    const tr = tSysAdmin('en') as unknown as Record<string, string>
    for (const key of ['nav_cat_attr_defs', 'add_new', 'options', 'nav_item_domain_mappings', 'idm_title', 'idm_new', 'idm_item_id', 'idm_auto_assign']) expect(text).toContain(tr[key])
    expect(text).toContain(tr.idm_gaps_title)
    const topic = getHelpTopic('catalog-quality')!
    expect(topic.videoId).toBeUndefined()
    expect(topic.noVideo).toBeUndefined() // a video is planned: this topic keeps the "coming soon" state
    expect(topic.adminLinks.map((l) => l.href)).toEqual(['/admin/category-attribute-definitions', '/admin/item-domain-mappings'])
  })

  it('topic 8 is a written guide without a video and states the key rules (no secrets in chat, revoke only, who creates)', () => {
    const en = HELP_CONTENT['api-keys'].en
    const text = [...en.steps, ...(en.notes ?? []).map((n) => n.text)].join(' ')
    expect(text).toMatch(/Never put an API key into a chat, a ticket, an e-mail or a screenshot/)
    expect(text).toMatch(/admins can only look and revoke/)
    expect(text).toMatch(/shop owners create their own keys/)
    expect(text).toMatch(/Developers create system keys/)
    expect(text).toMatch(/no "rotate" button/)
    expect(text).toMatch(/never expire/)
    expect(text).toMatch(/admin:\*/)
    expect(en.notes?.filter((n) => n.kind === 'warning').length).toBeGreaterThanOrEqual(2)
    const tr = tSysAdmin('en') as unknown as Record<string, string>
    for (const key of ['nav_api_keys', 'revoke', 'last_used', 'scope']) expect(text).toContain(tr[key])
    const topic = getHelpTopic('api-keys')!
    expect(topic.noVideo).toBe(true)
    expect(topic.videoId).toBeUndefined()
    expect(topic.adminLinks.map((l) => l.href)).toEqual(['/admin/api-keys'])
  })

  it('no secret-looking key material in the SOP texts', () => {
    for (const id of HELP_TOPIC_IDS) for (const l of ['en', 'el'] as const) {
      const c = HELP_CONTENT[id][l]
      const all = [c.title, c.summary, c.intro ?? '', ...c.steps, ...(c.notes ?? []).map((n) => n.text)].join(' ')
      expect(all, `${id}.${l}`).not.toMatch(/pundo_(int|shp|sho|usr|prt)_[A-Za-z0-9_-]{8,}/)
    }
  })

  it('helpLang maps everything but el to en', () => {
    expect(helpLang('el')).toBe('el')
    expect(helpLang('de')).toBe('en')
    expect(helpLang('ar')).toBe('en')
  })
})
