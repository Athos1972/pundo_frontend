/**
 * Journey: admin-crm-relation-channels (F7600 CRM-Backbone, Org-Schnitt, Spec 2026-10-25-crm-person-contact-modell)
 * Runbook: e2e/journeys/admin-crm-relation-channels.md
 *
 * Person mit zwei Firmenbeziehungen, Kanäle mit genau einem Besitzer, Outreach an die Beziehungsmail, Opt-out sperrt
 * die Person und nicht die Firma, Person ohne aktive Beziehung ist nicht wählbar, Sendegate für Rechtsstufe "red".
 * Wirkung statt Durchlauf: jede UI-Aktion wird in API und Datenbank (crm_channel, crm_message, crm_suppression,
 * crm_send_approval) und im Mail-Sink des Slots/der Testinstanz nachgeprüft.
 *
 * Fixtures (eigene, sich ausschließende Zustände; alle Namen und Werte tragen die Lauf-ID):
 * | Fixture                         | Was                                                              | Prüft                                   |
 * |---------------------------------|------------------------------------------------------------------|-----------------------------------------|
 * | Org `E2E RelCh A <run>`         | Akquise-Ziel, Org-Mail info-a, Beziehung zu Maria (per API)      | AC 6/7: Org-Kanal vs. Beziehungskanal    |
 * | Org `E2E RelCh B <run>`         | Akquise-Ziel QUEUED, Org-Mail info-b; Beziehung per UI           | AC 14/15: Outreach, Opt-out nach Besitzer |
 * | Org `E2E RelCh C <run>`         | Akquise-Ziel QUEUED, Org-Mail info-c, wird auf "red" gesetzt      | AC 49/50: Sendegate und Freigabe         |
 * | Org `E2E RelCh Plain <run>`     | kein Akquise-Ziel (Lead-Status leer)                             | AC 26: Filter "nur Akquise-Ziele"        |
 * | Person `E2E RelCh Maria <run>`  | Beziehungen zu A (Manager) und B (Advisor, per UI), private Nummer| AC 6–10, 14, 15                          |
 * | Person `E2E RelCh Peter <run>`  | eigene Mail als Personenkanal                                    | AC 10: fremder Wert wird abgelehnt       |
 * | Person `E2E RelCh Stranger <run>`| nur Personenkanal, keine Beziehung                              | AC 41: nicht als Empfänger wählbar       |
 * | Person `E2E RelCh Elena <run>`  | Geburtstag 14.03. ohne Jahr, Beziehung ohne Rolle (zu A)         | AC 23a/36: EL-Anzeige                    |
 *
 * Cleanup: Personen werden gelöscht, Lead-Orgs per Suppress geschlossen (das CRM löscht keine Orgs).
 */
import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures'
import { adminHeaders, adminLogin, apiFetch } from './_helpers'
import { mailsTo, waitForMail } from './_helpers/mail-sink'
import { psql } from './_helpers/test-data'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests duerfen nicht gegen Produktiv-Ports laufen!')
}

const run = randomUUID().slice(0, 8)
const digits = run.replace(/[^0-9]/g, '').padEnd(6, '7').slice(0, 6)
const P = `E2E RelCh ${run}`
const V = {
  infoA: `e2e-relch-info-a-${run}@test-e2e.invalid`,
  infoB: `e2e-relch-info-b-${run}@test-e2e.invalid`,
  infoC: `e2e-relch-info-c-${run}@test-e2e.invalid`,
  mariaA: `e2e-relch-maria-a-${run}@test-e2e.invalid`,
  mariaB: `e2e-relch-maria-b-${run}@test-e2e.invalid`,
  peter: `e2e-relch-peter-${run}@test-e2e.invalid`,
  stranger: `e2e-relch-stranger-${run}@test-e2e.invalid`,
  mariaPhone: `+357 99 ${digits.slice(0, 3)} ${digits.slice(3, 6)}`,
}
const mariaName = `${P} Maria`

const ctx = {
  token: '',
  orgA: 0, orgB: 0, orgC: 0, orgPlain: 0,
  maria: 0, peter: 0, stranger: 0, elena: 0, greek: 0,
  relA: 0, relB: 0,
}
const api = (method: string, path: string, body?: unknown) => apiFetch(method, path, body, adminHeaders(ctx.token))

interface ChannelOut { id: number; kind: string; value_normalized: string; consent_state: string; owner: { type: string; id: number } }
interface RelationOut { id: number; person: { id: number; display_name: string | null; optout: boolean }; org: { id: number }; roles: string[]; active: boolean; channels: ChannelOut[]; person_channels: ChannelOut[] }
interface OrgDetail { id: number; name: string; lead: { state: string | null; version: number }; channels: ChannelOut[]; relations: RelationOut[] }
interface Recipient { channel_id: number; owner_type: string; value: string; person: { id: number } | null }

async function createOrg(name: string, email: string | null, asLead: boolean, city?: string): Promise<OrgDetail> {
  const res = await api('POST', '/api/v1/admin/crm/orgs', {
    name, city: city ?? null, as_lead: asLead, channels: email ? [{ kind: 'email', value: email }] : [], source: { source: 'manual' },
  })
  expect(res.status, JSON.stringify(res.data)).toBe(201)
  return res.data as OrgDetail
}
async function org(id: number): Promise<OrgDetail> {
  const res = await api('GET', `/api/v1/admin/crm/orgs/${id}`)
  expect(res.ok).toBe(true)
  return res.data as OrgDetail
}
async function confirmBusiness(id: number) {
  const o = await org(id)
  const res = await api('POST', `/api/v1/admin/crm/orgs/${id}/confirm-business`, { lead_version: o.lead.version })
  expect(res.ok, JSON.stringify(res.data)).toBe(true)
  expect((res.data as OrgDetail).lead.state).toBe('QUEUED')
}
async function createPerson(body: Record<string, unknown>): Promise<number> {
  const res = await api('POST', '/api/v1/admin/crm/persons', body)
  expect(res.status, JSON.stringify(res.data)).toBe(201)
  return (res.data as { id: number }).id
}
async function recipients(orgId: number): Promise<Recipient[]> {
  const res = await api('GET', `/api/v1/admin/crm/orgs/${orgId}/outreach/recipients`)
  expect(res.ok).toBe(true)
  return res.data as Recipient[]
}
const rowsWithValue = (value: string) => Number(psql(`select count(*) from crm_channel where value_normalized = '${value}'`))
const channelId = (value: string) => Number(psql(`select id from crm_channel where value_normalized = '${value}'`))
const consentOf = (id: number) => psql(`select consent_state from crm_channel where id = ${id}`)
const suppressedCount = (id: number) =>
  Number(psql(`select count(*) from crm_suppression s join crm_channel c on c.value_hmac = s.suppression_key where c.id = ${id}`))
const leadStateOf = (id: number) => psql(`select coalesce(lead_state, '') from crm_org where id = ${id}`)

/** Vorschau (EN) laden und senden; wartet auf die Antwort der Send-Route. */
async function previewAndSend(page: Page) {
  const composer = page.locator('section', { has: page.getByRole('heading', { name: 'Outreach' }) })
  await composer.getByRole('button', { name: 'English', exact: true }).click()
  await composer.getByRole('button', { name: 'Load preview' }).click()
  await expect(composer.getByLabel('Subject')).not.toHaveValue('', { timeout: 15_000 })
  const sent = page.waitForResponse((res) => res.url().includes('/outreach/send') && res.request().method() === 'POST')
  await composer.getByRole('button', { name: 'Send email' }).click()
  const res = await sent
  expect(res.status(), 'outreach/send through the admin proxy').toBeLessThan(300)
  return (await res.json()) as { message_id: number }
}

async function confirmOptOut(page: Page, link: string) {
  const url = new URL(link.replace(/^<|>$/g, ''))
  await page.goto(`${BASE_URL}${url.pathname}${url.search}&lang=en`)
  const answered = page.waitForResponse((res) => res.url().includes('/api/crm/opt-out') && res.request().method() === 'POST')
  await page.getByRole('button', { name: /confirm unsubscribe/i }).click()
  expect((await answered).status(), 'the public opt-out always answers 200').toBe(200)
  await expect(page.locator('.bg-green-50')).toBeVisible({ timeout: 10_000 })
}

test.describe.serial('F7600 CRM — person with two organisations: relation channels, outreach, opt-out by owner, send gate', () => {
  test.beforeAll(async () => {
    ctx.token = await adminLogin()
    ctx.orgA = (await createOrg(`${P} A`, V.infoA, true, 'Nicosia')).id
    ctx.orgB = (await createOrg(`${P} B`, V.infoB, true, 'Limassol')).id
    ctx.orgC = (await createOrg(`${P} C`, V.infoC, true, 'Larnaca')).id
    ctx.orgPlain = (await createOrg(`${P} Plain`, null, false)).id
    await confirmBusiness(ctx.orgB)
    await confirmBusiness(ctx.orgC)
    ctx.maria = await createPerson({ display_name: mariaName })
    ctx.peter = await createPerson({ display_name: `${P} Peter`, channels: [{ kind: 'email', value: V.peter }] })
    ctx.stranger = await createPerson({ display_name: `${P} Stranger`, channels: [{ kind: 'email', value: V.stranger }] })
    ctx.elena = await createPerson({ display_name: `${P} Elena`, birth_date: '1990-03-14', birth_year_unknown: true })
    const relA = await api('POST', '/api/v1/admin/crm/relations', { person_id: ctx.maria, org_id: ctx.orgA, roles: ['manager'] })
    expect(relA.status, JSON.stringify(relA.data)).toBe(201)
    ctx.relA = (relA.data as RelationOut).id
    const chA = await api('POST', `/api/v1/admin/crm/relations/${ctx.relA}/channels`, { kind: 'email', value: V.mariaA })
    expect(chA.status, JSON.stringify(chA.data)).toBe(201)
    const relElena = await api('POST', '/api/v1/admin/crm/relations', { person_id: ctx.elena, org_id: ctx.orgA })
    expect(relElena.status, 'a relation without roles is created (E22)').toBe(201)
  })

  test('person page: second relation by search, its relation mail and a personal number (one owner each)', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.maria}`)
    await waitForPageHydrated(page)

    // relation to B, found by name, role advisor
    await page.locator('#person-org').click()
    await page.getByRole('textbox', { name: 'Organisation' }).fill(`${P} B`)
    await page.getByRole('option', { name: new RegExp(`${P} B.*Limassol`) }).click()
    await page.getByRole('checkbox', { name: 'Advisor' }).check()
    await page.getByRole('button', { name: 'Add relation' }).click()
    await expect.poll(async () => (await org(ctx.orgB)).relations.find((r) => r.person.id === ctx.maria)?.roles, { timeout: 15_000 })
      .toEqual(['advisor'])
    ctx.relB = (await org(ctx.orgB)).relations.find((r) => r.person.id === ctx.maria)!.id

    // relation mail at B (channel editor of the relation card)
    const relBEditor = page.getByTestId(`crm-channels-relation-${ctx.relB}`)
    await relBEditor.getByRole('button', { name: '+ Add channel' }).click()
    await relBEditor.getByLabel('Value').fill(V.mariaB)
    await relBEditor.getByRole('button', { name: 'Add channel', exact: true }).click()
    await expect(relBEditor.locator('tr[data-channel-id]', { hasText: V.mariaB })).toBeVisible()

    // personal number (valid for all relations)
    const personal = page.getByTestId(`crm-channels-person-${ctx.maria}`)
    await personal.getByRole('button', { name: '+ Add channel' }).click()
    await personal.getByLabel('Type').selectOption('phone')
    await personal.getByLabel('Value').fill(V.mariaPhone)
    await personal.getByRole('button', { name: 'Add channel', exact: true }).click()
    await expect(personal.locator('tr[data-channel-id]')).toHaveCount(1)

    // effect: each value exactly one row with exactly one owner
    expect(psql(`select count(*) || '|' || coalesce(min(relation_id), 0) from crm_channel where value_normalized = '${V.mariaB}'`)).toBe(`1|${ctx.relB}`)
    const phone = psql(`select value_normalized || '|' || person_id || '|' || case when org_id is null and relation_id is null then 'only-person' else 'other' end from crm_channel where person_id = ${ctx.maria}`)
    expect(phone).toBe(`+35799${digits}|${ctx.maria}|only-person`)
  })

  test('AC 6/7/8: the organisation page separates its own channels from the contact persons; the personal number shows at both', async ({ adminPage: page }) => {
    const phoneValue = `+35799${digits}`
    for (const [orgId, own, rel, other] of [[ctx.orgA, V.infoA, V.mariaA, V.mariaB], [ctx.orgB, V.infoB, V.mariaB, V.mariaA]] as const) {
      await page.goto(`${BASE_URL}/admin/crm/orgs/${orgId}`)
      await waitForPageHydrated(page)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(orgId === ctx.orgA ? `${P} A` : `${P} B`)
      const orgChannels = page.getByTestId(`crm-channels-org-${orgId}`)
      await expect(orgChannels).toContainText(own)
      await expect(orgChannels).not.toContainText(rel)
      const relation = (await org(orgId)).relations.find((r) => r.person.id === ctx.maria)!
      const card = page.getByTestId('crm-contact-persons').getByTestId(`relation-${relation.id}`)
      await expect(card.getByRole('link', { name: mariaName })).toBeVisible()
      await expect(card.getByTestId(`crm-channels-relation-${relation.id}`)).toContainText(rel)
      await expect(card.getByRole('list', { name: 'Personal' })).toContainText(phoneValue)
      // the org value is no channel row of the contact person (it may only be offered as preferred-channel reference)
      await expect(page.getByTestId('crm-contact-persons').locator('tr[data-channel-id]', { hasText: own })).toHaveCount(0)
      await expect(orgChannels.locator('tr[data-channel-id]', { hasText: own })).toHaveCount(1)
      await expect(page.locator('main')).not.toContainText(other) // AC 7: never the mail of the other organisation
    }
    expect(rowsWithValue(phoneValue), 'AC 8: one row for the personal number').toBe(1)
  })

  test('AC 10/9: a value of another person is refused (shared channel); the own value of the other relation becomes personal', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.maria}`)
    await waitForPageHydrated(page)
    // AC 10
    const relAEditor = page.getByTestId(`crm-channels-relation-${ctx.relA}`)
    await relAEditor.getByRole('button', { name: '+ Add channel' }).click()
    await relAEditor.getByLabel('Value').fill(V.peter)
    await relAEditor.getByRole('button', { name: 'Add channel', exact: true }).click()
    await expect(relAEditor.getByRole('alert')).toHaveText(/This value belongs to another person, so it is a shared channel\. Keep it at the organisation\./)
    expect(psql(`select count(*) || '|' || coalesce(min(person_id), 0) from crm_channel where value_normalized = '${V.peter}'`)).toBe(`1|${ctx.peter}`)
    await relAEditor.getByRole('button', { name: 'Cancel' }).click()

    // AC 9: the A relation mail entered at the B relation → dialog → kept as personal channel, still one row
    const relBEditor = page.getByTestId(`crm-channels-relation-${ctx.relB}`)
    await relBEditor.getByRole('button', { name: '+ Add channel' }).click()
    await relBEditor.getByLabel('Value').fill(V.mariaA)
    await relBEditor.getByRole('button', { name: 'Add channel', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('This value is already a channel of this person. Keep it as a personal channel?')
    await dialog.getByRole('button', { name: 'Keep as personal channel' }).click()
    await expect.poll(() => psql(`select count(*) || '|' || coalesce(min(person_id), 0) from crm_channel where value_normalized = '${V.mariaA}'`), { timeout: 15_000 })
      .toBe(`1|${ctx.maria}`)
    const a = (await org(ctx.orgA)).relations.find((r) => r.person.id === ctx.maria)!
    const b = (await org(ctx.orgB)).relations.find((r) => r.person.id === ctx.maria)!
    expect(a.person_channels.map((c) => c.value_normalized)).toContain(V.mariaA)
    expect(b.person_channels.map((c) => c.value_normalized)).toContain(V.mariaA)
  })

  test('AC 14/41: outreach on B to the relation mail of Maria; a person without an active relation is not offered', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgB}`)
    await waitForPageHydrated(page)
    const select = page.getByLabel('Recipient')
    const labels = await select.locator('option').allTextContents()
    expect(labels.some((l) => l.startsWith(`${V.infoB} (organisation)`)), 'org channel offered').toBe(true)
    expect(labels).toContain(`${mariaName} · ${V.mariaB} (relation)`)
    expect(labels.join('\n'), 'AC 41: the stranger has no active relation and is not offered').not.toContain(V.stranger)
    // AC 41 also on the API: a direct send to the stranger's channel is refused, nothing reaches the sink
    const refused = await api('POST', `/api/v1/admin/crm/orgs/${ctx.orgB}/outreach/send`, {
      language: 'en', subject: 'x', body: 'y', idempotency_key: `e2e-relch-stranger-${run}`, recipient_channel_id: channelId(V.stranger),
    })
    expect(refused.status).toBe(422)
    expect(JSON.stringify(refused.data)).toContain('outreach_recipient_invalid')
    expect(mailsTo(V.stranger)).toHaveLength(0)

    await select.selectOption({ label: `${mariaName} · ${V.mariaB} (relation)` })
    const { message_id } = await previewAndSend(page)
    const mail = await waitForMail(V.mariaB)
    expect(mail.subject.length).toBeGreaterThan(0)
    expect(psql(`select org_id || '|' || recipient_channel_id || '|' || person_id || '|' || relation_id from crm_message where id = ${message_id}`))
      .toBe(`${ctx.orgB}|${channelId(V.mariaB)}|${ctx.maria}|${ctx.relB}`)
    await expect.poll(() => leadStateOf(ctx.orgB), { timeout: 10_000 }).toBe('CONTACTED')
  })

  test('AC 15: Maria opts out from that mail — the person is blocked, both organisations are not', async ({ adminPage: page, page: publicPage }) => {
    test.setTimeout(90_000)
    const mail = await waitForMail(V.mariaB)
    await confirmOptOut(publicPage, mail.listUnsubscribe!)

    await expect.poll(() => psql(`select optout_at is not null from crm_person where id = ${ctx.maria}`), { timeout: 10_000 }).toBe('t')
    const owned = psql(`select id from crm_channel where person_id = ${ctx.maria} or relation_id in (select id from crm_person_org_relation where person_id = ${ctx.maria})`)
      .split('\n').map(Number)
    expect(owned.length, 'personal and relation channels of Maria').toBe(3)
    for (const id of owned) {
      expect(consentOf(id)).toBe('optout')
      expect(suppressedCount(id)).toBe(1)
    }
    // the organisations keep lead status and their own channels
    expect(leadStateOf(ctx.orgA)).toBe('SOURCED')
    expect(leadStateOf(ctx.orgB)).toBe('CONTACTED')
    for (const value of [V.infoA, V.infoB]) {
      expect(consentOf(channelId(value))).not.toBe('optout')
      expect(suppressedCount(channelId(value))).toBe(0)
    }
    expect((await recipients(ctx.orgB)).some((r) => r.person?.id === ctx.maria), 'Maria is in no recipient list').toBe(false)

    // the UI shows it, and a mail to the org channel of B still reaches the sink
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgB}`)
    await waitForPageHydrated(page)
    const card = page.getByTestId(`relation-${ctx.relB}`)
    await expect(card.getByText('Opted out', { exact: true })).toBeVisible()
    const labels = await page.getByLabel('Recipient').locator('option').allTextContents()
    expect(labels.join('\n')).not.toContain(mariaName)
    await page.getByLabel('Recipient').selectOption({ label: labels.find((l) => l.startsWith(`${V.infoB} (organisation)`))! })
    await previewAndSend(page)
    await waitForMail(V.infoB)
  })

  test('AC 49/50: legal tier red blocks the send until an admin approves with a reason; one approval = one send', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    const cid = channelId(V.infoC)
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgC}`)
    await waitForPageHydrated(page)
    await page.getByTestId(`crm-channels-org-${ctx.orgC}`).getByLabel(`Legal tier: ${V.infoC}`).selectOption('red')
    await expect.poll(() => psql(`select legal_tier from crm_channel where id = ${cid}`), { timeout: 10_000 }).toBe('red')

    const composer = page.locator('section', { has: page.getByRole('heading', { name: 'Outreach' }) })
    const gate = composer.getByTestId('crm-outreach-gate')
    await expect(gate).toHaveAttribute('role', 'alert')
    await expect(gate).toContainText('Legal tier Red: sending only after admin approval.')
    await expect(composer.getByTestId('crm-outreach-tier')).toHaveText('Legal tier: Red')
    await composer.getByRole('button', { name: 'English', exact: true }).click()
    await composer.getByRole('button', { name: 'Load preview' }).click()
    await expect(composer.getByLabel('Subject')).not.toHaveValue('', { timeout: 15_000 })
    await expect(composer.getByRole('button', { name: 'Send email' })).toBeDisabled()
    // the backend refuses as well (no UI bypass): 422 with the tier, no message, nothing in the sink
    const blocked = await api('POST', `/api/v1/admin/crm/orgs/${ctx.orgC}/outreach/send`, {
      language: 'en', subject: 's', body: 'b', idempotency_key: `e2e-relch-red-${run}`, recipient_channel_id: cid,
    })
    expect(blocked.status).toBe(422)
    expect(blocked.data).toMatchObject({ detail: { detail: 'outreach_tier_approval_required', tier: 'red' } })
    expect(Number(psql(`select count(*) from crm_message where org_id = ${ctx.orgC}`))).toBe(0)
    expect(mailsTo(V.infoC)).toHaveLength(0)

    // approve with a reason
    await gate.getByRole('button', { name: 'Approve' }).click()
    const dialog = page.getByRole('dialog')
    const approve = dialog.getByRole('button', { name: 'Approve' })
    await dialog.getByLabel('Reason (10 to 500 characters)').fill('short')
    await expect(approve).toBeDisabled()
    await dialog.getByLabel('Reason (10 to 500 characters)').fill(`E2E relation-channels ${run}: owner asked for the offer by phone`)
    await approve.click()
    await expect(gate).toHaveAttribute('role', 'status')
    await expect(gate).toContainText(/Approved by admin #\d+ until /)
    expect(psql(`select count(*) || '|' || min(effective_tier) || '|' || count(used_message_id) from crm_send_approval where org_id = ${ctx.orgC}`))
      .toBe('1|red|0')
    expect(Number(psql(`select count(*) from crm_interaction where org_id = ${ctx.orgC} and payload->>'event' = 'send_approval'`))).toBe(1)

    // send: mail in the sink, the approval is used up by exactly this message
    await expect(composer.getByRole('button', { name: 'Send email' })).toBeEnabled()
    const sent = page.waitForResponse((res) => res.url().includes('/outreach/send') && res.request().method() === 'POST')
    await composer.getByRole('button', { name: 'Send email' }).click()
    const { message_id } = (await (await sent).json()) as { message_id: number }
    await waitForMail(V.infoC)
    expect(Number(psql(`select used_message_id from crm_send_approval where org_id = ${ctx.orgC}`))).toBe(message_id)
    // the next send needs a new approval
    await expect(gate).toHaveAttribute('role', 'alert', { timeout: 10_000 })
    const again = await api('POST', `/api/v1/admin/crm/orgs/${ctx.orgC}/outreach/send`, {
      language: 'en', subject: 's', body: 'b', idempotency_key: `e2e-relch-red2-${run}`, recipient_channel_id: cid,
    })
    expect(again.status).toBe(422)
  })

  test('AC 26: the organisation list shows names and lead status; "only acquisition targets" hides organisations without lead status', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/orgs?q=${encodeURIComponent(P)}`)
    await waitForPageHydrated(page)
    const rows = page.locator('tbody tr')
    const names = await rows.locator('td:first-child a').allTextContents()
    expect(names.sort()).toEqual([`${P} A`, `${P} B`, `${P} C`, `${P} Plain`])
    await expect(rows.filter({ hasText: `${P} Plain` })).toContainText('No acquisition target')
    await expect(rows.locator('td:first-child', { hasText: /^—$/ })).toHaveCount(0)
    await page.getByRole('link', { name: 'Only acquisition targets' }).click()
    await expect(page).toHaveURL(/lead_only=true/)
    await expect(page.locator('tbody tr', { hasText: `${P} Plain` })).toHaveCount(0)
    await expect(page.locator('tbody tr', { hasText: `${P} A` })).toHaveCount(1)
  })

  test('AC 23a/36 in Greek: "Role missing" and the birthday without year are translated (system admin EN/EL)', async ({ adminPage: page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'el', url: BASE_URL }])
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.elena}`)
    await waitForPageHydrated(page)
    await expect(page.getByTestId('person-birthday')).toHaveText('14 Μαρτίου')
    await expect(page.locator('main')).not.toContainText('2000')
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgA}`)
    await waitForPageHydrated(page)
    await expect(page.getByRole('heading', { name: 'Κανάλια του οργανισμού' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Υπεύθυνοι επικοινωνίας' })).toBeVisible()
    const elena = (await org(ctx.orgA)).relations.find((r) => r.person.id === ctx.elena)!
    await expect(page.getByTestId(`relation-${elena.id}`).getByText('Λείπει ρόλος')).toBeVisible()
  })

  test('AC 32 (R7): splitting a free name later shows the replacement first, then derives the name; the audit has no values', async ({ adminPage: page }) => {
    const free = `Γεωργίου Μαρία ${run}`
    const derived = `Μαρία Γεωργίου${run}`
    ctx.greek = await createPerson({ display_name: free })
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.greek}`)
    await waitForPageHydrated(page)
    const form = page.locator('form', { has: page.getByLabel('First name') })
    await form.getByLabel('First name').fill('Μαρία')
    await form.getByLabel('Last name').fill(`Γεωργίου${run}`)
    await expect(form).toContainText(`Saving replaces the current name "${free}" with "${derived}".`)
    await form.getByRole('button', { name: 'Save', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`The current name "${free}" will be replaced by "${derived}". Continue?`)
    await dialog.getByRole('button', { name: 'Replace name' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(derived, { timeout: 15_000 })
    const p = await api('GET', `/api/v1/admin/crm/persons/${ctx.greek}`)
    expect(p.data).toMatchObject({ display_name: derived, first_name: 'Μαρία', name_derived: true })
    // audit: field names only, never the old or new value
    const audit = psql(`select action || '|' || field_names || '|' || (row_to_json(a)::text like '%Γεωργίου%') from crm_masterdata_audit a where entity_type = 'person' and entity_id = ${ctx.greek} and action = 'display_name_derived'`)
    expect(audit).toBe('display_name_derived|first_name,last_name,display_name|false')
    const found = await api('GET', `/api/v1/admin/crm/persons?q=${encodeURIComponent('Μαρία Γεω')}`)
    expect((found.data as { items: Array<{ id: number }> }).items.map((i) => i.id)).toContain(ctx.greek)
  })

  test.afterAll(async () => {
    if (!ctx.token) return
    for (const id of [ctx.maria, ctx.peter, ctx.stranger, ctx.elena, ctx.greek].filter(Boolean)) {
      await api('DELETE', `/api/v1/admin/crm/persons/${id}`).catch(() => undefined)
    }
    for (const id of [ctx.orgA, ctx.orgB, ctx.orgC].filter(Boolean)) {
      const o = await org(id).catch(() => null)
      if (!o || o.lead.state === 'HARD_OPTOUT') continue
      await api('POST', `/api/v1/admin/crm/orgs/${id}/suppress`, { reason: 'hard_optout', lead_version: o.lead.version }).catch(() => undefined)
    }
  })
})
