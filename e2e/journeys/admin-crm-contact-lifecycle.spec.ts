/**
 * Journey: CRM Org-Lead-Lifecycle (vormals CRM Contact Lifecycle, Stufe 0+1; F7600 CRM-Backbone Org-Schnitt)
 * Runbook: e2e/journeys/admin-crm-contact-lifecycle.md
 *
 * Seit dem Org-Schnitt traegt die Organisation den Lead-Status (`/admin/crm/orgs/{id}`, Lead-Block mit `lead_version`);
 * die Contact-Seiten gibt es nicht mehr. Kanaele haben genau einen Besitzer, hier die Organisation.
 *
 * Covers:
 *   AK1a — Quellen-Auswahl: "manual" waehlbar, gespeicherte Org hat source=manual
 *   AK1b — Default-Quelle business_card; Default "Akquise-Ziel" angehakt → Lead-Status SOURCED
 *   AK2a — Stammdaten: Stadt aendern via OrgEditForm (name="edit_city"), Lead-Status unveraendert
 *   AK2b — Kanal hinzufuegen im Bereich "Kanaele der Organisation" (Besitzer = Organisation)
 *   AK2d — Kanal entfernen (2+ Kanaele)
 *   v3   — Zentrale zuordnen: "Gehoert zu" an der Filiale, "Filialen (n)" an der Zentrale, zweite Ebene abgelehnt
 *   Stufe0 — Confirm Business → business_status=confirmed, Lead-Status QUEUED
 *   Stufe0 — Suppress → HARD_OPTOUT → Endzustand, keine Lead-Status-Aktionen mehr, Org-Kanaele gesperrt
 *
 * Fixtures:
 * | Fixture-Name              | Was wird aufgebaut                          | Was wird geprueft                              |
 * |---------------------------|---------------------------------------------|------------------------------------------------|
 * | E2E CRM {uuid}            | Org via UI, source=manual, Akquise-Ziel     | Anlage, Stammdaten, Kanaele, Lead-Status       |
 * | +357 96 {uuid-short}      | Zweiter Kanal via UI                        | ChannelEditor Add + Remove                     |
 * | E2E CRM HQ {uuid}         | Org via API, ohne Lead-Status               | Zentrale (Filialen-Liste, kein eigenes Feld)   |
 * | E2E CRM Third {uuid}      | Org via API, ohne Lead-Status               | zweite Ebene wird nicht angeboten / abgelehnt  |
 *
 * Cleanup: Org via Suppress (HARD_OPTOUT) — kein DELETE-Endpoint im CRM. Zentrale und dritte Org haben keinen Lead-Status
 * und bleiben als Stammdaten stehen (E2E-Praefix, Lauf-ID im Namen).
 */

import { test, expect } from '../fixtures'
import { randomUUID } from 'crypto'
import { adminLogin, adminHeaders, apiFetch } from './_helpers'
import { waitForPageHydrated } from './_helpers/hydration'
import { psql } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'

// Port-Safety — niemals gegen Produktiv-Ports laufen
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const ORG_NAME = `E2E CRM ${UUID}`
const HQ_NAME = `E2E CRM HQ ${UUID}`
const THIRD_NAME = `E2E CRM Third ${UUID}`
const EMAIL = `e2e-crm-${UUID}@test-e2e.invalid`
// Phone number unique per run (derived from UUID hex)
const PHONE_SUFFIX = parseInt(UUID.slice(0, 6), 16) % 900000 + 100000
const PHONE = `+357 96 ${PHONE_SUFFIX}`

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  orgId: null as number | null,
  hqId: 0,
  thirdId: 0,
}

interface Channel { id: number; kind: string; value_normalized: string; consent_state: string; owner: { type: string; id: number } }
interface OrgDetail {
  id: number; name: string; city: string | null; business_status: string
  lead: { state: string | null; version: number }
  sources: Array<{ source: string }>
  channels: Channel[]
  parent: { id: number; name: string } | null
  children: { count: number; items: Array<{ id: number; name: string }> }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Admin-API-Aufruf mit Cookie `admin_token` (geteilter `apiFetch`/`adminHeaders` aus `_helpers`). */
const adminFetch = (method: string, urlPath: string, body?: unknown) =>
  apiFetch(method, urlPath, body, adminHeaders(ctx.adminToken))

/** F8950 T22: pollt die Org im Backend, bis `pred` gilt (ersetzt networkidle + waitForTimeout nach UI-Mutationen). */
async function orgWhen(id: number, pred: (o: OrgDetail) => boolean, message: string): Promise<OrgDetail> {
  let last: OrgDetail | undefined
  await expect.poll(async () => {
    const r = await adminFetch('GET', `/api/v1/admin/crm/orgs/${id}`)
    if (!r.ok) return false
    last = r.data as OrgDetail
    return pred(last)
  }, { message, timeout: 15_000 }).toBe(true)
  return last as OrgDetail
}

async function getOrg(id: number): Promise<OrgDetail> {
  const res = await adminFetch('GET', `/api/v1/admin/crm/orgs/${id}`)
  expect(res.ok, `GET org ${id}: ${res.status}`).toBe(true)
  return res.data as OrgDetail
}

async function createMasterDataOrg(name: string): Promise<number> {
  const res = await adminFetch('POST', '/api/v1/admin/crm/orgs', { name, city: 'Nicosia', as_lead: false, channels: [], source: { source: 'manual' } })
  expect(res.status, JSON.stringify(res.data)).toBe(201)
  expect((res.data as OrgDetail).lead.state, 'plain master data has no lead status').toBeNull()
  return (res.data as OrgDetail).id
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('CRM Org-Lead-Lifecycle — Stufe 0+1 (org cut)', () => {

  test.beforeAll(async () => {
    test.setTimeout(60_000)
    // Login first — all subsequent apiFetch calls require ctx.adminToken
    ctx.adminToken = await adminLogin()
    // Health-check (authenticated)
    const health = await adminFetch('GET', '/api/v1/admin/crm/orgs?limit=1')
    if (!health.ok) throw new Error(`Backend CRM health check failed: ${health.status}`)
  })

  // ── AC1a/AC1b: Org anlegen via UI mit Quellen-Auswahl ─────────────────────

  test('AC1a+AC1b: Org anlegen via UI — Quelle "manual", Default business_card, Akquise-Ziel → SOURCED', async ({ adminPage: page }) => {
    test.setTimeout(90_000)

    await page.goto(`${BASE_URL}/admin/crm/orgs/new`)
    await waitForPageHydrated(page)

    // AC1b: Quellen-Auswahl vorausgewählt mit business_card; Akquise-Ziel standardmäßig angehakt
    const sourceSelect = page.locator('select#org_source_select')
    await expect(sourceSelect).toBeVisible({ timeout: 10_000 })
    await expect(sourceSelect).toHaveValue('business_card')
    const asLead = page.getByRole('checkbox', { name: /Acquisition target/ })
    await expect(asLead).toBeChecked()

    // AC1a: Quelle auf "manual" wechseln
    await sourceSelect.selectOption('manual')
    await expect(sourceSelect).toHaveValue('manual')

    // OrgForm: kein Ansprechpartner-Feld mehr (Personen kommen als Beziehung auf der Detailseite dazu)
    await expect(page.locator('input[name="display_name"], input[name="role_title"]')).toHaveCount(0)
    await page.getByLabel('Organisation name').fill(ORG_NAME)
    await page.getByLabel('Email address').fill(EMAIL)
    await page.getByLabel('City').fill('Nicosia')

    await page.getByRole('button', { name: 'Create organisation' }).click()

    await page.waitForURL(/\/admin\/crm\/orgs\/\d+$/, { timeout: 15_000 })
    const urlMatch = page.url().match(/\/admin\/crm\/orgs\/(\d+)$/)
    expect(urlMatch, 'Redirect zur Detail-Page mit ID erwartet').not.toBeNull()
    ctx.orgId = parseInt(urlMatch![1], 10)

    await waitForPageHydrated(page)

    // genau ein h1 = Org-Name (AC 27); Lead-Status-Badge SOURCED
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ORG_NAME)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('[data-lead-state="SOURCED"]')).toHaveText('Sourced')

    // API-Verifikation: Quelle ist "manual", Lead-Status SOURCED, die Mail ist ein Kanal der Organisation
    const org = await getOrg(ctx.orgId)
    expect(org.sources.find((s) => s.source === 'manual'), 'Org should have source=manual').toBeDefined()
    expect(org.lead.state).toBe('SOURCED')
    expect(org.channels.map((c) => [c.kind, c.value_normalized, c.owner.type])).toEqual([['email', EMAIL, 'org']])
  })

  // ── AC2a: Stammdaten — Stadt ändern ───────────────────────────────────────

  test('AC2a: Stammdaten — Stadt ändern via OrgEditForm', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set from AC1').not.toBeNull()

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    await page.getByRole('button', { name: 'Edit', exact: true }).click()

    // Edit-Formular: city input has name="edit_city"
    const cityInput = page.locator('input[name="edit_city"]')
    await expect(cityInput).toBeVisible({ timeout: 5_000 })
    await cityInput.fill('Limassol')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // API-Verifikation: Stadt aktualisiert, kein Lead-Status-Wechsel
    const org = await orgWhen(ctx.orgId!, (o) => o.city === 'Limassol', 'Stadt wird auf Limassol aktualisiert')
    expect(org.city).toBe('Limassol')
    expect(org.lead.state).toBe('SOURCED')
  })

  // ── AC2b: Kanal hinzufügen ────────────────────────────────────────────────

  test('AC2b: Kanal hinzufügen im Bereich "Kanäle der Organisation" (Besitzer Organisation)', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set').not.toBeNull()

    // the org was created in this run with exactly one channel (unique per run): no leftovers to clean up
    expect((await getOrg(ctx.orgId!)).channels).toHaveLength(1)

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    const orgChannels = page.getByTestId(`crm-channels-org-${ctx.orgId}`)
    await orgChannels.getByRole('button', { name: /Add channel/ }).click()

    const addForm = orgChannels.getByTestId('channel-add-form')
    await expect(addForm).toBeVisible({ timeout: 5_000 })
    const kindSelect = addForm.getByLabel('Type')
    await kindSelect.selectOption('phone')
    await expect(kindSelect).toHaveValue('phone')
    await addForm.getByLabel('Value').fill(PHONE)
    await addForm.getByRole('button', { name: 'Add channel' }).click()

    // API-Verifikation: Telefon-Kanal existiert, Besitzer ist die Organisation
    const org = await orgWhen(ctx.orgId!, (o) => o.channels.some((ch) => ch.kind === 'phone_call'), 'Phone-Kanal wird angelegt')
    const phoneChannel = org.channels.find((c) => c.kind === 'phone_call')
    expect(phoneChannel, 'Phone channel should be added').toBeDefined()
    expect(phoneChannel!.owner).toEqual({ type: 'org', id: ctx.orgId })
    expect(org.channels).toHaveLength(2)
    // and it is shown in the org channel table
    await expect(orgChannels.locator(`tr[data-channel-id="${phoneChannel!.id}"]`)).toContainText(phoneChannel!.value_normalized)
  })

  // ── AC2d: Kanal entfernen ─────────────────────────────────────────────────

  test('AC2d: Kanal entfernen — email-Kanal weg, phone bleibt', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set').not.toBeNull()

    // Verify 2+ channels exist before trying to remove
    const pre = await getOrg(ctx.orgId!)
    expect(pre.channels.length, 'Need 2+ channels for remove test').toBeGreaterThanOrEqual(2)
    expect(pre.channels.find((c) => c.kind === 'email'), 'Email channel must exist').toBeDefined()

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    const orgChannels = page.getByTestId(`crm-channels-org-${ctx.orgId}`)
    await expect(orgChannels.locator('tr').filter({ hasText: EMAIL })).toBeVisible({ timeout: 10_000 })
    const removeBtn = orgChannels.getByRole('button', { name: `Remove: ${EMAIL}` })
    await expect(removeBtn).toBeEnabled({ timeout: 5_000 })
    await removeBtn.click()

    // API-Verifikation: email-Kanal weg, phone-Kanal bleibt
    const org = await orgWhen(ctx.orgId!, (o) => !o.channels.some((ch) => ch.kind === 'email'), 'Email-Kanal wird entfernt')
    expect(org.channels.find((c) => c.kind === 'email'), 'Email channel should be removed').toBeUndefined()
    expect(org.channels.find((c) => c.kind === 'phone_call'), 'Phone channel should remain').toBeDefined()
    await expect(orgChannels.locator('tr').filter({ hasText: EMAIL })).toHaveCount(0)
  })

  // ── v3: Zentrale zuordnen ─────────────────────────────────────────────────

  test('v3: Zentrale zuordnen — "Belongs to" an der Filiale, "Branches (1)" an der Zentrale, zweite Ebene abgelehnt', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    expect(ctx.orgId, 'orgId must be set').not.toBeNull()
    ctx.hqId = await createMasterDataOrg(HQ_NAME)
    ctx.thirdId = await createMasterDataOrg(THIRD_NAME)

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#crm-org-parent').click()
    await page.getByRole('textbox', { name: 'Belongs to (head office)' }).fill(`CRM HQ ${UUID}`)
    await page.getByRole('option', { name: new RegExp(`${HQ_NAME}.*#${ctx.hqId}`) }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // effect in the data, then on both pages
    const branch = await orgWhen(ctx.orgId!, (o) => o.parent?.id === ctx.hqId, 'Zentrale wird gesetzt')
    expect(branch.parent).toEqual({ id: ctx.hqId, name: HQ_NAME })
    const parentSection = page.getByTestId('crm-org-parent')
    await expect(parentSection).toContainText('Belongs to (head office):')
    await expect(parentSection.getByRole('link', { name: HQ_NAME })).toHaveAttribute('href', `/admin/crm/orgs/${ctx.hqId}`)

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.hqId}`)
    await waitForPageHydrated(page)
    const hqSection = page.getByTestId('crm-org-parent')
    await expect(hqSection.getByRole('heading', { name: 'Branches (1)' })).toBeVisible()
    await expect(hqSection.getByRole('link', { name: ORG_NAME })).toHaveAttribute('href', `/admin/crm/orgs/${ctx.orgId}`)
    expect((await getOrg(ctx.hqId)).children).toEqual({ count: 1, items: [{ id: ctx.orgId, name: ORG_NAME }] })
    // a head office with branches cannot become a branch itself: hint instead of the field
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByTestId('crm-org-parent-field')).toContainText('This organisation has branches, so it cannot belong to a head office itself.')
    await expect(page.locator('#crm-org-parent')).toHaveCount(0)

    // second level: the branch is not offered as head office of a third organisation, the head office is
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.thirdId}`)
    await waitForPageHydrated(page)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#crm-org-parent').click()
    const parentSearch = page.getByRole('textbox', { name: 'Belongs to (head office)' })
    await parentSearch.fill(UUID) // matches all three organisations of this run by name
    await expect(page.getByRole('option', { name: new RegExp(`${HQ_NAME}.*#${ctx.hqId}`) })).toBeVisible()
    // only the head office: the branch has a head office of its own, the organisation being edited is left out
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1)
    await expect(page.getByRole('option', { name: new RegExp(`#${ctx.orgId}$`) })).toHaveCount(0)
    // … and the backend refuses it as well (one level only)
    const refused = await adminFetch('PATCH', `/api/v1/admin/crm/orgs/${ctx.thirdId}`, { parent_org_id: ctx.orgId })
    expect(refused.status).toBe(422)
    expect(JSON.stringify(refused.data)).toContain('org_parent_has_parent')
    expect((await getOrg(ctx.thirdId)).parent).toBeNull()
  })

  // ── Confirm Business ──────────────────────────────────────────────────────

  test('Stufe0: Confirm Business → business_status=confirmed, Lead-Status QUEUED', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    const actions = page.getByTestId('crm-lead-actions')
    await actions.getByRole('button', { name: 'Confirm business' }).click()

    // ConfirmDialog (role="dialog")
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole('button', { name: 'Confirm business' }).click()

    // API-Verifikation: business_status=confirmed, Lead-Status QUEUED
    const org = await orgWhen(ctx.orgId!, (o) => o.business_status === 'confirmed', 'business_status wird confirmed')
    expect(org.business_status).toBe('confirmed')
    expect(org.lead.state).toBe('QUEUED')
    await expect(page.locator('[data-lead-state="QUEUED"]')).toHaveText('Queued')
  })

  // ── Suppress → HARD_OPTOUT ────────────────────────────────────────────────

  test('Stufe0: Suppress → HARD_OPTOUT → Endzustand, keine Lead-Status-Aktionen, Org-Kanal gesperrt', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    const actions = page.getByTestId('crm-lead-actions')
    await actions.getByRole('button', { name: 'Suppress / Opt-out' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    // hard_optout is preselected — confirm directly
    await expect(dialog.getByRole('radio', { name: 'Hard opt-out' })).toBeChecked()
    await dialog.getByRole('button', { name: 'Suppress / Opt-out' }).click()

    // Endzustands-Text (OrgLeadActions: final lead status)
    await expect(page.getByText(/final lead status \(Hard opt-out\)/)).toBeVisible({ timeout: 10_000 })

    // No lead status actions in the final state
    await expect(actions.getByRole('button', { name: 'Confirm business' })).toHaveCount(0)
    await expect(actions.getByRole('button', { name: 'Set lead status' })).toHaveCount(0)
    await expect(actions.getByRole('button', { name: 'Suppress / Opt-out' })).toHaveCount(0)

    // API-Verifikation: HARD_OPTOUT; the remaining org channel is blocked (consent optout, value in crm_suppression)
    const org = await orgWhen(ctx.orgId!, (o) => o.lead.state === 'HARD_OPTOUT', 'Org wird HARD_OPTOUT')
    expect(org.lead.state).toBe('HARD_OPTOUT')
    const phone = org.channels.find((c) => c.kind === 'phone_call')!
    expect(phone.consent_state).toBe('optout')
    expect(Number(psql(`select count(*) from crm_suppression s join crm_channel c on c.value_hmac = s.suppression_key where c.id=${phone.id}`))).toBe(1)
  })

  // ── Teardown ─────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    if (!ctx.orgId) return
    const res = await adminFetch('GET', `/api/v1/admin/crm/orgs/${ctx.orgId}`)
    const org = res.data as OrgDetail
    if (!res.ok || org.lead.state === 'HARD_OPTOUT') return
    await adminFetch('POST', `/api/v1/admin/crm/orgs/${ctx.orgId}/suppress`, {
      reason: 'hard_optout',
      lead_version: org.lead.version,
    }).catch(() => { /* ignore — already suppressed */ })
  })
})
