/**
 * Journey: CRM-Outreach-Mail → Opt-out (B8950-016 T31/T32; F7600 CRM-Backbone Org-Schnitt: Token v2, Opt-out nach Besitzer)
 * Runbook: e2e/journeys/crm-opt-out.md
 *
 * Wirkung statt Durchlauf: die Mail kommt wirklich im Mail-Sink an (echte SMTP-Unterhaltung), ihre Teile, Links und
 * Bilder werden geprueft, der Abmelde-Link aus der Mail wird im Browser geoeffnet, und die Sperre steht danach in der
 * Datenbank. Seit dem Org-Schnitt (F7600 T4 Outreach und Opt-out) traegt der Link einen Token v2
 * (`v2|channel_id|message_id|nonce`, eigene Signatur-Domaene); ein Link im Format vor dem Schnitt
 * (`contact|channel|nonce`) bleibt ohne Wirkung, die Seite antwortet trotzdem neutral.
 *
 * Fixtures (alle Werte tragen die Lauf-ID, keine Annahme ueber den Bestand der Prod-Kopie):
 * | Fixture                                   | Was                                                          | Prueft                                   |
 * |-------------------------------------------|--------------------------------------------------------------|------------------------------------------|
 * | Org `E2E OptOut {uuid}`                   | Akquise-Ziel, Quelle business_card, Org-Mail = Empfaenger    | AC1-AC3: Org-Kanal → Org HARD_OPTOUT      |
 * | Org `E2E OptOut Rel {uuid}` + Person      | Beziehung (Rolle manager) mit eigener Beziehungs-Mail        | AC4: Beziehungskanal → nur Person gesperrt |
 *
 * Cleanup: die Org aus AC1-AC3 endet in HARD_OPTOUT (Terminal), die zweite Org wird per Suppress geschlossen, die Person
 * geloescht. Eine Org kann das CRM nicht loeschen.
 */
import { test, expect } from '../fixtures'
import { randomUUID } from 'crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { adminLogin, adminHeaders, apiFetch } from './_helpers'
import { waitForMail } from './_helpers/mail-sink'
import { psql } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL, IS_WORKTREE_SLOT, SLOT_ENV } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests duerfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const EMAIL = `e2e-optout-${UUID}@test-e2e.invalid`
const REL_ORG_EMAIL = `e2e-optout-rel-org-${UUID}@test-e2e.invalid`
const REL_EMAIL = `e2e-optout-rel-${UUID}@test-e2e.invalid`
const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

const ctx = {
  token: null as string | null,
  orgId: 0, channelId: 0, messageId: 0,
  relOrgId: 0, relOrgChannelId: 0, personId: 0, relationId: 0, relChannelId: 0,
}
const adminFetch = (method: string, urlPath: string, body?: unknown) =>
  apiFetch(method, urlPath, body, adminHeaders(ctx.token))

interface ChannelOut { id: number; kind: string; value_normalized: string; owner: { type: string; id: number } }
interface OrgDetail { id: number; lead: { state: string | null; version: number }; channels: ChannelOut[] }

/** Org als Akquise-Ziel anlegen und das Geschaeft bestaetigen (Outreach braucht QUEUED). */
async function queuedOrg(name: string, email: string): Promise<OrgDetail> {
  const created = await adminFetch('POST', '/api/v1/admin/crm/orgs', {
    name, as_lead: true, channels: [{ kind: 'email', value: email }], source: { source: 'business_card' },
  })
  expect(created.status, JSON.stringify(created.data)).toBe(201)
  const org = created.data as OrgDetail
  const confirmed = await adminFetch('POST', `/api/v1/admin/crm/orgs/${org.id}/confirm-business`, { lead_version: org.lead.version })
  expect(confirmed.ok, JSON.stringify(confirmed.data)).toBe(true)
  expect((confirmed.data as OrgDetail).lead.state).toBe('QUEUED')
  return confirmed.data as OrgDetail
}

/** Vorschau (EN) an den gewaehlten Empfaenger rendern und senden; liefert Betreff und Nachrichten-ID. */
async function sendOutreach(orgId: number, recipientChannelId: number, key: string) {
  const preview = await adminFetch('POST', `/api/v1/admin/crm/orgs/${orgId}/outreach/preview`, {
    language: 'en', template_id: 'first_contact_email', recipient_channel_id: recipientChannelId,
  })
  expect(preview.ok, JSON.stringify(preview.data)).toBe(true)
  const p = preview.data as { subject: string; body_rendered: string; recipient_channel_id: number; gate: { approval_required: boolean } }
  expect(p.recipient_channel_id, 'the preview renders for the chosen recipient').toBe(recipientChannelId)
  expect(p.gate.approval_required, 'a green recipient needs no approval (send gate)').toBe(false)
  const sent = await adminFetch('POST', `/api/v1/admin/crm/orgs/${orgId}/outreach/send`, {
    language: 'en', subject: p.subject, body: p.body_rendered, idempotency_key: `e2e-optout-${key}-${UUID}`,
    recipient_channel_id: recipientChannelId,
  })
  expect(sent.ok, `outreach/send must succeed against the sink (SMTP_HOST of the test instance): ${JSON.stringify(sent.data)}`).toBe(true)
  return { subject: p.subject, messageId: (sent.data as { message_id: number }).message_id }
}

/**
 * Prueft den Token aus der Mail mit dem Backend-Code (gleicher Pepper wie die Testinstanz) und baut einen Token im
 * Format vor dem Org-Schnitt mit dem Algorithmus des alten `make_optout_token` (HMAC ueber `contact|channel|nonce`
 * ohne Domaene). Der Pepper verlaesst den Python-Prozess nicht, ausgegeben werden nur die Tokens.
 */
const TOKEN_PY = `
import base64, hashlib, hmac, json, sys
sys.path.insert(0, ".")
from core.config import settings
from ingestor.lib.crm.suppression import legacy_optout_token_valid, verify_optout_token_v2
a = json.loads(sys.argv[1])
b64 = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode("ascii")
payload = f"{a['contact_id']}|{a['channel_id']}|e2e{a['nonce']}".encode()
legacy = b64(payload) + "." + b64(hmac.new(settings.crm_suppression_pepper.encode(), payload, hashlib.sha256).digest())
v2 = verify_optout_token_v2(a["v2"])
print(json.dumps({"legacy": legacy, "legacy_recognised": legacy_optout_token_valid(legacy), "v2": list(v2) if v2 else None}))
`
function tokens(args: { contact_id: number; channel_id: number; nonce: string; v2: string }) {
  const out = execFileSync(path.join(BACKEND_REPO, '.venv', 'bin', 'python'), ['-I', '-c', TOKEN_PY, JSON.stringify(args)], {
    cwd: BACKEND_REPO, encoding: 'utf8',
  })
  return JSON.parse(out) as { legacy: string; legacy_recognised: boolean; v2: [number, number] | null }
}

/** Abmelde-Link aus der Mail auf das Frontend dieses Laufs umschreiben (Pfad und Token bleiben unveraendert). */
function onThisFrontend(link: string): string {
  const url = new URL(link)
  return `${BASE_URL}${url.pathname}${url.search}`
}

/** Opt-out-Seite oeffnen, bestaetigen (kein Auto-POST beim Laden, R5) und auf die Antwort der Opt-out-Route warten. */
async function confirmOptOut(page: Page, url: string) {
  await page.goto(`${url}&lang=en`) // the page reads the browser language otherwise (Playwright locale is el)
  const answered = page.waitForResponse((res) => res.url().includes('/api/crm/opt-out') && res.request().method() === 'POST')
  await page.getByRole('button', { name: /confirm unsubscribe/i }).click()
  expect((await answered).status(), 'the public opt-out always answers 200 (no enumeration)').toBe(200)
  await expect(page.locator('.bg-green-50')).toBeVisible({ timeout: 10_000 })
}

const suppressedCount = (channelId: number) =>
  Number(psql(`select count(*) from crm_suppression s join crm_channel c on c.value_hmac = s.suppression_key where c.id=${channelId}`))
const consentOf = (channelId: number) => psql(`select consent_state from crm_channel where id=${channelId}`)
const leadStateOf = (orgId: number) => psql(`select coalesce(lead_state, '') from crm_org where id=${orgId}`)

test.describe.serial('CRM outreach mail → opt-out (token v2, opt-out by owner)', () => {
  test('AC1: outreach mail to the org channel arrives in the sink as multipart with real links and images', async () => {
    test.setTimeout(90_000)
    ctx.token = await adminLogin()
    const org = await queuedOrg(`E2E OptOut ${UUID}`, EMAIL)
    ctx.orgId = org.id
    const channel = org.channels.find((c) => c.kind === 'email')!
    expect(channel.owner, 'the mail address is a channel of the organisation').toEqual({ type: 'org', id: org.id })
    ctx.channelId = channel.id

    // the org channel is the default recipient
    const recipients = await adminFetch('GET', `/api/v1/admin/crm/orgs/${org.id}/outreach/recipients`)
    expect(recipients.ok).toBe(true)
    expect(recipients.data).toEqual([expect.objectContaining({ channel_id: channel.id, owner_type: 'org', is_default: true })])

    const { subject, messageId } = await sendOutreach(org.id, channel.id, 'org')
    ctx.messageId = messageId

    const mail = await waitForMail(EMAIL)
    expect(mail.subject).toBe(subject)
    expect(mail.from).toContain('care@pundo.cy')
    expect(mail.text, 'plain-text part').toBeTruthy()
    expect(mail.html, 'html part').toBeTruthy()
    expect(mail.listUnsubscribe).toMatch(/^<http.+\/crm\/opt-out\?token=.+>$/)
    expect(mail.html).toContain('/crm/opt-out?token=')
    // The links point at a TEST frontend (CRM_OPTOUT_BASE_URL_* in start_test_server.sh), never at the live domain.
    // Slot gap (03-implementation-T19): the slot backend keeps the default http://localhost:3500, so in a worktree slot
    // the link names 3500 although this run's frontend is the slot port; the test opens the same path on BASE_URL.
    const linkUrl = new URL(mail.listUnsubscribe!.replace(/^<|>$/g, ''))
    expect(linkUrl.hostname).toBe('localhost')
    expect(IS_WORKTREE_SLOT ? ['3500', String(SLOT_ENV.frontendPort)] : ['3500']).toContain(linkUrl.port)

    // the message is bound to exactly this recipient channel
    expect(psql(`select org_id || '|' || recipient_channel_id from crm_message where id=${messageId}`)).toBe(`${org.id}|${channel.id}`)
    expect(leadStateOf(org.id)).toBe('CONTACTED')

    // images: absolute URLs that really deliver an image
    expect(mail.imageUrls.length).toBeGreaterThanOrEqual(1)
    for (const url of mail.imageUrls) {
      expect(url, 'image url must be absolute https').toMatch(/^https:\/\//)
      const res = await fetch(url, { method: 'HEAD' })
      expect(res.status, `image ${url}`).toBe(200)
      expect(res.headers.get('content-type') ?? '', `image ${url}`).toMatch(/^image\//)
    }
  })

  test('AC2: an unsubscribe link in the format before the org cut has no effect (page stays neutral)', async ({ page }) => {
    test.setTimeout(60_000)
    const mail = await waitForMail(EMAIL)
    const v2 = new URL(mail.listUnsubscribe!.replace(/^<|>$/g, '')).searchParams.get('token')!
    const t = tokens({ contact_id: ctx.orgId, channel_id: ctx.channelId, nonce: UUID, v2 })
    // the mail token is a v2 token for exactly this channel and message (and the pepper is the one of the test instance)
    expect(t.v2).toEqual([ctx.channelId, ctx.messageId])
    // the old link is a genuine, correctly signed token of the old format (the server would recognise and log it)
    expect(t.legacy_recognised).toBe(true)

    await confirmOptOut(page, `${BASE_URL}/crm/opt-out?token=${encodeURIComponent(t.legacy)}`)

    // no effect: lead status, consent and suppression unchanged
    expect(leadStateOf(ctx.orgId)).toBe('CONTACTED')
    expect(consentOf(ctx.channelId)).not.toBe('optout')
    expect(suppressedCount(ctx.channelId)).toBe(0)
  })

  test('AC3: the v2 link from the mail blocks by owner: org channel → organisation HARD_OPTOUT, value suppressed', async ({ page }) => {
    test.setTimeout(60_000)
    const mail = await waitForMail(EMAIL)
    await confirmOptOut(page, onThisFrontend(mail.listUnsubscribe!.replace(/^<|>$/g, '')))

    // effect, not just the confirmation text: organisation terminal, channel opted out, its HMAC in crm_suppression
    await expect.poll(() => leadStateOf(ctx.orgId), { timeout: 10_000 }).toBe('HARD_OPTOUT')
    expect(consentOf(ctx.channelId)).toBe('optout')
    expect(suppressedCount(ctx.channelId)).toBe(1)
    expect(Number(psql(`select count(*) from crm_interaction where org_id=${ctx.orgId} and kind='suppression'`))).toBeGreaterThan(0)
  })

  test('AC4: a relation channel opt-out blocks the person and that channel, not the organisation', async ({ page }) => {
    test.setTimeout(90_000)
    const org = await queuedOrg(`E2E OptOut Rel ${UUID}`, REL_ORG_EMAIL)
    ctx.relOrgId = org.id
    ctx.relOrgChannelId = org.channels.find((c) => c.kind === 'email')!.id

    const person = await adminFetch('POST', '/api/v1/admin/crm/persons', { first_name: 'E2E', last_name: `OptOut ${UUID}` })
    expect(person.status, JSON.stringify(person.data)).toBe(201)
    ctx.personId = (person.data as { id: number }).id
    // role "manager", not "owner": the owner rule (an owner's objection also blocks the organisation) must not apply here
    const relation = await adminFetch('POST', '/api/v1/admin/crm/relations', { person_id: ctx.personId, org_id: org.id, roles: ['manager'] })
    expect(relation.status, JSON.stringify(relation.data)).toBe(201)
    ctx.relationId = (relation.data as { id: number }).id
    const withChannel = await adminFetch('POST', `/api/v1/admin/crm/relations/${ctx.relationId}/channels`, { kind: 'email', value: REL_EMAIL })
    expect(withChannel.status, JSON.stringify(withChannel.data)).toBe(201)
    ctx.relChannelId = (withChannel.data as { channels: ChannelOut[] }).channels.find((c) => c.value_normalized === REL_EMAIL)!.id

    const recipients = (await adminFetch('GET', `/api/v1/admin/crm/orgs/${org.id}/outreach/recipients`)).data as Array<{ channel_id: number; owner_type: string; relation_id: number | null }>
    expect(recipients).toContainEqual(expect.objectContaining({ channel_id: ctx.relChannelId, owner_type: 'relation', relation_id: ctx.relationId }))
    const { messageId } = await sendOutreach(org.id, ctx.relChannelId, 'rel')
    expect(psql(`select recipient_channel_id || '|' || person_id || '|' || relation_id from crm_message where id=${messageId}`))
      .toBe(`${ctx.relChannelId}|${ctx.personId}|${ctx.relationId}`)

    const mail = await waitForMail(REL_EMAIL)
    await confirmOptOut(page, onThisFrontend(mail.listUnsubscribe!.replace(/^<|>$/g, '')))

    // the person and the relation channel are blocked …
    await expect.poll(() => psql(`select optout_at is not null from crm_person where id=${ctx.personId}`), { timeout: 10_000 }).toBe('t')
    expect(consentOf(ctx.relChannelId)).toBe('optout')
    expect(suppressedCount(ctx.relChannelId)).toBe(1)
    // … the organisation is not: lead status unchanged, its own channel neither opted out nor suppressed
    expect(leadStateOf(org.id)).toBe('CONTACTED')
    expect(consentOf(ctx.relOrgChannelId)).not.toBe('optout')
    expect(suppressedCount(ctx.relOrgChannelId)).toBe(0)
  })

  test.afterAll(async () => {
    if (!ctx.token) return
    if (ctx.personId) await adminFetch('DELETE', `/api/v1/admin/crm/persons/${ctx.personId}`).catch(() => undefined)
    for (const orgId of [ctx.orgId, ctx.relOrgId].filter(Boolean)) {
      const res = await adminFetch('GET', `/api/v1/admin/crm/orgs/${orgId}`)
      const org = res.data as OrgDetail
      if (!res.ok || org.lead.state === 'HARD_OPTOUT') continue
      await adminFetch('POST', `/api/v1/admin/crm/orgs/${orgId}/suppress`, { reason: 'hard_optout', lead_version: org.lead.version })
        .catch(() => undefined)
    }
  })
})
