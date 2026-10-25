// F8960 AK 8 + 9: help data source, route existence, EN/EL content parity
import { describe, it, expect } from 'vitest'
import {
  HELP_TOPICS, HELP_TOPIC_IDS, getHelpTopic, isValidVideoId, youtubeWatchUrl, formatDuration,
} from '@/lib/system-admin-help'
import { HELP_CONTENT, allHelpSteps, helpLang, type HelpLang, type HelpTopicContent } from '@/lib/system-admin-help-content'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { adminRouteExists } from './helpers/admin-routes'

const GREEK = /[Ͱ-Ͽ]/
// proper nouns / abbreviations that are identical in both languages on purpose
const SAME_ALLOWED = new Set(['CRM'])

describe('help topics (data source)', () => {
  it('has the topics in the agreed order (3b between shops and products)', () => {
    // the agreed core order; later topics are appended at the end, so the topic count is deliberately not hard-coded
    const core = ['admin-tour', 'claims-owners', 'shops', 'catalog-basics', 'products', 'translations', 'crm', 'crm-persons']
    expect(HELP_TOPICS.map((t) => t.id).slice(0, core.length)).toEqual(core)
    expect(HELP_TOPICS.map((t) => t.number).slice(0, core.length)).toEqual(['1', '2', '3', '3b', '4', '4b', '5', '5b'])
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
    expect(adminRouteExists('/admin/crm/orgs')).toBe(true)
    expect(adminRouteExists('/admin/does-not-exist')).toBe(false)
    expect(adminRouteExists('/admin/login')).toBe(false) // outside (portal)
    expect(adminRouteExists('/admin/crm/orgs/[id]')).toBe(false) // dynamic segment is no literal match
    expect(adminRouteExists('/shops')).toBe(false)
  })
})

describe('CRM org cut (F7600): help links follow the new routes', () => {
  it('no help link points to the removed contact pages; the routes are gone without a redirect page', () => {
    const hrefs = HELP_TOPICS.flatMap((t) => t.adminLinks.map((l) => l.href))
    expect(hrefs.filter((h) => h.includes('crm/contacts'))).toEqual([])
    expect(adminRouteExists('/admin/crm/contacts')).toBe(false)
    expect(adminRouteExists('/admin/crm/contacts/new')).toBe(false)
  })

  it('topics 5 and 5b link to the organisation list and the review list', () => {
    for (const id of ['crm', 'crm-persons'] as const) {
      const hrefs = getHelpTopic(id)!.adminLinks.map((l) => l.href)
      expect(hrefs, id).toContain('/admin/crm/orgs')
      expect(hrefs, id).toContain('/admin/crm/review')
    }
    expect(adminRouteExists('/admin/crm/review')).toBe(true)
    expect(adminRouteExists('/admin/crm/orgs/new')).toBe(true)
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

  it('keeps EN and EL in step: same number of steps, sections, rules and notes, same note kinds', () => {
    for (const id of HELP_TOPIC_IDS) {
      const { en, el } = HELP_CONTENT[id]
      expect(el.steps.length, `${id} steps`).toBe(en.steps.length)
      expect(el.sections?.map((s) => s.steps.length), `${id} sections`).toEqual(en.sections?.map((s) => s.steps.length))
      expect(el.rules?.length ?? 0, `${id} rules`).toBe(en.rules?.length ?? 0)
      expect(el.notes?.length ?? 0, `${id} notes`).toBe(en.notes?.length ?? 0)
      expect(el.notes?.map((n) => n.kind)).toEqual(en.notes?.map((n) => n.kind))
      expect(Boolean(el.intro), `${id} intro`).toBe(Boolean(en.intro))
      ;[...(en.rules ?? []), ...(en.sections ?? []).map((s) => s.heading), ...allHelpSteps(en)].forEach((p) => expect(p.trim(), id).not.toBe(''))
    }
  })

  it('EL uses Greek script (title, summary, rules, section headings, every step and note) and is not a copy of EN', () => {
    for (const id of HELP_TOPIC_IDS) {
      const { en, el } = HELP_CONTENT[id]
      const greekParts = [
        el.title, el.summary, ...(el.intro ? [el.intro] : []), ...(el.rules ?? []),
        ...(el.sections ?? []).map((s) => s.heading), ...allHelpSteps(el), ...(el.notes ?? []).map((n) => n.text),
      ]
      greekParts.filter((p) => !SAME_ALLOWED.has(p)).forEach((p) => expect(p, `${id}: ${p.slice(0, 40)}`).toMatch(GREEK))
      const enSteps = allHelpSteps(en)
      const pairs: [string, string][] = [
        [en.title, el.title], [en.summary, el.summary], ...enSteps.map((s, i) => [s, allHelpSteps(el)[i]] as [string, string]),
        ...(en.rules ?? []).map((r, i) => [r, el.rules![i]] as [string, string]),
        ...(en.sections ?? []).map((s, i) => [s.heading, el.sections![i].heading] as [string, string]),
      ]
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
    expect(topic.videoId).toBeTruthy()
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
    expect(topic.videoId).toBeTruthy()
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
    expect(topic.videoId).toBeTruthy()
    expect(topic.noVideo).toBeUndefined() // has a video, so no "written guide only" flag
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
      const all = [c.title, c.summary, c.intro ?? '', ...(c.rules ?? []), ...allHelpSteps(c), ...(c.notes ?? []).map((n) => n.text)].join(' ')
      expect(all, `${id}.${l}`).not.toMatch(/pundo_(int|shp|sho|usr|prt)_[A-Za-z0-9_-]{8,}/)
    }
  })

  it('helpLang maps everything but el to en', () => {
    expect(helpLang('el')).toBe('el')
    expect(helpLang('de')).toBe('en')
    expect(helpLang('ar')).toBe('en')
  })
})

// F7600 CRM-Backbone, task "SOP EN/EL" (AC 47 SOP): topics 5 and 5b describe the org model (organisations with a lead
// status, channels with exactly one owner, relations person x organisation, send gate, card rule) in EN and EL.
describe('CRM topics after the org cut (F7600 CRM-Backbone, SOP EN/EL)', () => {
  const LANGS: HelpLang[] = ['en', 'el']
  const CRM_IDS = ['crm', 'crm-persons'] as const
  const textOf = (c: HelpTopicContent) =>
    [c.title, c.summary, c.intro ?? '', ...(c.rules ?? []), ...(c.sections ?? []).map((s) => s.heading), ...allHelpSteps(c), ...(c.notes ?? []).map((n) => n.text)].join('\n')
  const tr = (l: HelpLang) => tSysAdmin(l) as unknown as Record<string, string>

  // the three rules people forget (design 9.1): one owner per channel, reference instead of copy, derived name
  const MUST_RULES: Record<HelpLang, RegExp[]> = {
    en: [/exactly one owner/, /Reference, not copy/, /built from first and last name/],
    el: [/ακριβώς έναν κάτοχο/, /Παραπομπή, όχι αντίγραφο/, /σχηματίζεται από όνομα και επώνυμο/],
  }

  it.each(LANGS)('%s: both topics have the box "Rules that are easy to forget" with the three rules to remember', (l) => {
    for (const id of CRM_IDS) {
      const rules = HELP_CONTENT[id][l].rules ?? []
      expect(rules.length, id).toBeGreaterThanOrEqual(3)
      const text = rules.join('\n')
      for (const re of MUST_RULES[l]) expect(text, `${id} ${l}: ${re}`).toMatch(re)
      // the rules use the words of the screen: the relation field "Preferred channel"
      expect(text, `${id} ${l}`).toContain(tr(l).crm_relation_preferred)
    }
    expect(tr(l).help_rules_title).toBeTruthy()
    // topic 5b names the field "Name" and the confirm button of the name replacement
    const persons = (HELP_CONTENT['crm-persons'][l].rules ?? []).join('\n')
    expect(persons).toContain(tr(l).crm_person_name)
    expect(persons).toContain(tr(l).crm_person_name_replace_ok)
  })

  it.each(LANGS)('%s: topic 5 explains the send gate (legal tier, approval setting, who approves, required reason, one approval = one send)', (l) => {
    const c = HELP_CONTENT.crm[l]
    const text = textOf(c)
    const t = tr(l)
    for (const key of ['crm_detail_legal_tier', 'crm_tier_green', 'crm_tier_amber', 'crm_tier_red', 'crm_approval_tiers_title', 'crm_outreach_approve', 'crm_outreach_approve_reason', 'crm_composer_send', 'crm_action_change_legal']) {
      expect(text, `${l}: ${key}`).toContain(t[key])
    }
    // the warning box exactly as the composer shows it for a red recipient
    expect(text).toContain(t.crm_err_tier_approval_required.replace('{tier}', t.crm_tier_red))
    expect(text).toContain('crm:send_approve')
    expect(text).toMatch(l === 'en' ? /exactly one send to this recipient and expires after 7 days/ : /ακριβώς μία αποστολή σε αυτόν τον παραλήπτη και λήγει μετά από 7 ημέρες/)
    expect(text).toMatch(l === 'en' ? /reason[^.]*\(required\)/ : /αιτιολόγηση[^.]*\(υποχρεωτικό\)/)
    expect(c.sections?.map((s) => s.heading).join('\n')).toMatch(l === 'en' ? /send gate/ : /έγκριση πριν από την αποστολή/)
  })

  it.each(LANGS)('%s: topic 5 states the card rule (mobile only next to a landline, service numbers count as landline, unclear goes to review)', (l) => {
    const text = textOf(HELP_CONTENT.crm[l])
    const t = tr(l)
    if (l === 'en') {
      expect(text).toMatch(/landline and a mobile number, the landline stays with the organisation and the mobile becomes a channel of the person/)
      expect(text).toMatch(/Mobile numbers alone stay with the organisation, even with a name on the card/)
      expect(text).toMatch(/Service numbers starting with 7 or 8 count as a landline/)
    } else {
      expect(text).toMatch(/σταθερό τηλέφωνο και κινητό, το σταθερό μένει στον οργανισμό και το κινητό γίνεται κανάλι του προσώπου/)
      expect(text).toMatch(/Κινητά χωρίς σταθερό μένουν στον οργανισμό, ακόμη κι αν η κάρτα έχει όνομα/)
      expect(text).toMatch(/αρχίζουν από 7 ή 8 μετρούν ως σταθερό/)
    }
    for (const key of ['crm_review_cat_channel_owner', 'crm_channel_review_pending', 'crm_action_confirm_card', 'crm_sources_proofs_title', 'crm_relation_role_missing']) {
      expect(text, `${l}: ${key}`).toContain(t[key])
    }
  })

  it.each(LANGS)('%s: topic 5 covers organisations, lead status, head office, channels, opt-out by owner and the four review categories with the real labels', (l) => {
    const text = textOf(HELP_CONTENT.crm[l])
    const t = tr(l)
    const keys = [
      'crm_orgs_title', 'crm_org_new', 'crm_org_form_as_lead', 'crm_org_form_submit', 'crm_col_lead_state', 'crm_lead_none',
      'crm_filter_lead_only', 'crm_action_make_target', 'crm_action_set_lifecycle', 'crm_action_confirm_business', 'crm_state_NEEDS_REVIEW',
      'crm_state_QUEUED', 'crm_doc_title', 'crm_parent_belongs_to', 'crm_parent_title', 'crm_org_channels_title', 'crm_contact_persons_title',
      'crm_keep_personal', 'crm_last_channel_confirm', 'crm_channel_move', 'crm_outreach_recipient', 'crm_composer_preview',
      'crm_action_suppress', 'crm_state_HARD_OPTOUT', 'crm_person_optout_badge', 'crm_owner_rule_title', 'crm_role_owner', 'crm_role_manager',
      'crm_review_title', 'crm_review_cat_legacy', 'crm_review_cat_channel_owner', 'crm_review_cat_relations_without_role',
      'crm_review_cat_persons_name_parts', 'crm_review_resolve', 'crm_review_dismiss', 'crm_safety_link',
    ]
    for (const key of keys) expect(text, `${l}: ${key}`).toContain(t[key])
    // head office: one level, nothing inherited; area manager change only by script
    expect(text).toMatch(l === 'en' ? /Nothing is inherited/ : /δεν κληρονομείται τίποτα/)
    expect(text).toMatch(l === 'en' ? /tech team with a script, not in the admin/ : /τεχνική ομάδα με σενάριο \(script\), όχι στο admin/)
    // empty lead status = no acquisition target
    expect(text).toMatch(l === 'en' ? /Empty means "No acquisition target"/ : /Κενή σημαίνει «Δεν είναι στόχος προσέγγισης»/)
  })

  it.each(LANGS)('%s: topic 5b covers person, name, salutation, birthday, relations without dated roles and the channels of a person', (l) => {
    const text = textOf(HELP_CONTENT['crm-persons'][l])
    const t = tr(l)
    const keys = [
      'crm_persons_title', 'crm_person_new', 'crm_person_first_name', 'crm_person_last_name', 'crm_person_name', 'crm_person_name_derived_hint',
      'crm_person_salutation', 'crm_salutation_none', 'crm_salutation_unset', 'crm_birth_date', 'crm_birth_year_unknown',
      'crm_person_relations_title', 'crm_relation_add', 'crm_relation_role_add', 'crm_relation_role_missing', 'crm_relation_note',
      'crm_relation_period', 'crm_relation_end', 'crm_relation_edit', 'crm_relation_work_location', 'crm_relation_uses_org_address',
      'crm_relation_preferred', 'crm_relation_channels', 'crm_person_channels_title', 'crm_contact_persons_title', 'crm_relation_add_person',
      'crm_action_use_as_preferred', 'crm_keep_personal', 'crm_review_cat_relations_without_role', 'crm_person_remove_address',
    ]
    for (const key of keys) expect(text, `${l}: ${key}`).toContain(t[key])
    expect(text).toMatch(l === 'en' ? /Roles have no dates/ : /Οι ρόλοι δεν έχουν ημερομηνίες/)
    expect(text).toMatch(l === 'en' ? /only be written to through an active relation/ : /μόνο μέσω ενεργής σχέσης με οργανισμό/)
    expect(text).toMatch(l === 'en' ? /never guess it from the name/ : /ποτέ με εικασία από το όνομα/)
    // the search: organisation by 2 characters, person by 3 characters, never by typing an ID
    expect(text).toContain(l === 'en' ? 'type at least 2 characters' : 'τουλάχιστον 2 χαρακτήρες')
    expect(text).toContain(l === 'en' ? 'type at least 3 characters' : 'τουλάχιστον 3 χαρακτήρες')
    expect(text).not.toMatch(/ID of the organisation|person ID|ID του οργανισμού|ID του προσώπου/)
  })

  it('EN: no wording of the old contact model (contacts, identifiers, linking a person, roles with dates)', () => {
    for (const id of CRM_IDS) {
      const text = textOf(HELP_CONTENT[id].en)
      // old button "Add contact" (the new one is "Add contact person")
      expect(text, id).not.toMatch(/Add contact(?! person)/)
      for (const old of ['Document a contact', 'Link person', 'Linked person', 'dentifiers', 'End role', 'contact list', 'crm/contacts']) {
        expect(text, `${id}: ${old}`).not.toContain(old)
      }
      // "Contact person(s)" is the screen word for the people of an organisation; any other "contact(s)" is the old model
      expect(text.replace(/contact persons?/gi, ''), id).not.toMatch(/\bcontacts?\b/i)
    }
  })

  it('EL: no wording of the old contact model (επαφή, αναγνωριστικά, σύνδεση προσώπου, λήξη ρόλου)', () => {
    for (const id of CRM_IDS) {
      const text = textOf(HELP_CONTENT[id].el)
      for (const old of ['Προσθήκη επαφής', 'Καταγραφή επαφής', 'Σύνδεση προσώπου', 'Συνδεδεμένο πρόσωπο', 'αναγνωριστικ', 'Λήξη ρόλου', 'crm/contacts']) {
        expect(text, `${id}: ${old}`).not.toContain(old)
      }
      expect(text, id).not.toMatch(/επαφ/i)
    }
  })

  it.each(LANGS)('%s: every admin path named in the CRM texts is an existing page, and the texts name the organisation and review lists', (l) => {
    const all = CRM_IDS.map((id) => textOf(HELP_CONTENT[id][l])).join('\n')
    const paths = all.match(/\/admin\/[a-z/-]+/g) ?? []
    expect(paths).toEqual(expect.arrayContaining(['/admin/crm/orgs', '/admin/crm/review', '/admin/crm/persons']))
    for (const p of paths) expect(adminRouteExists(p), p).toBe(true)
  })
})
