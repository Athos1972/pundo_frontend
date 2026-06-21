/**
 * Journey: CRM Contact Lifecycle — Stufe 0+1
 * Runbook: e2e/journeys/admin-crm-contact-lifecycle.md
 *
 * Covers:
 *   AK1a — Source-Dropdown: "manual" wählbar, gespeicherter Kontakt hat source=manual
 *   AK1b — Default-Source: business_card vorausgewählt
 *   AK2a — Edit: Stadt ändern via ContactEditForm (name="edit_city")
 *   AK2b — Channel hinzufügen via ChannelEditor
 *   AK2d — Channel entfernen (2+ Kanäle) via ChannelEditor
 *   Stufe0 — Confirm Business → business_status=confirmed
 *   Stufe0 — Suppress → HARD_OPTOUT → Terminal-State (keine Buttons mehr)
 *
 * Fixtures:
 * | Fixture-Name          | Was wird aufgebaut           | Was wird geprüft                          |
 * |-----------------------|------------------------------|-------------------------------------------|
 * | E2E CRM {uuid}        | Kontakt via UI, source=manual| Create-Form + Source-Dropdown             |
 * | +357 96 {uuid-short}  | Zweiter Kanal via UI         | ChannelEditor Add + Remove                |
 *
 * Cleanup: Kontakt via Suppress (HARD_OPTOUT) — kein DELETE-Endpoint im CRM.
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { adminLogin as adminApiLogin } from './_helpers'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const ORG_NAME = `E2E CRM ${UUID}`
const EMAIL = `e2e-crm-${UUID}@test-e2e.invalid`
// Phone number unique per run (derived from UUID hex)
const PHONE_SUFFIX = parseInt(UUID.slice(0, 6), 16) % 900000 + 100000
const PHONE = `+357 96 ${PHONE_SUFFIX}`

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  contactId: null as number | null,
  contactVersion: 1,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminHeaders(): Record<string, string> {
  return { Cookie: `admin_token=${ctx.adminToken}` }
}

async function apiFetch(
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  let data: unknown = null
  try { data = await res.json() } catch { /* no body */ }
  return { ok: res.ok, status: res.status, data }
}

async function getContactVersion(id: number): Promise<number> {
  const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${id}`)
  return (res.data as { version: number }).version
}

async function setCookie(page: import('@playwright/test').Page) {
  await page.context().addCookies([{
    name: 'admin_token',
    value: ctx.adminToken!,
    domain: new URL(BASE_URL).hostname,
    path: '/',
  }])
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('CRM Contact Lifecycle — Stufe 0+1', () => {

  test.beforeAll(async () => {
    test.setTimeout(60_000)
    // Login first — all subsequent apiFetch calls require ctx.adminToken
    ctx.adminToken = await adminApiLogin()
    // Health-check (authenticated)
    const health = await apiFetch('GET', '/api/v1/admin/crm/contacts?limit=1')
    if (!health.ok) throw new Error(`Backend CRM health check failed: ${health.status}`)
  })

  // ── AC1a/AC1b: Kontakt anlegen via UI mit Source-Dropdown ─────────────────

  test('AC1a+AC1b: Kontakt anlegen via UI — Source-Dropdown "manual" + Default-Check', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)

    await page.goto(`${BASE_URL}/admin/crm/contacts/new`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // AC1b: Source-Dropdown vorausgewählt mit business_card
    const sourceSelect = page.locator('select#source_select')
    await expect(sourceSelect).toBeVisible({ timeout: 5_000 })
    await expect(sourceSelect).toHaveValue('business_card')

    // AC1a: Quelle auf "manual" wechseln
    await sourceSelect.selectOption('manual')
    await expect(sourceSelect).toHaveValue('manual')

    // ContactForm fields: name="org_name", name="email", name="city"
    await page.locator('input[name="org_name"]').fill(ORG_NAME)
    await page.locator('input[name="email"]').fill(EMAIL)
    await page.locator('input[name="city"]').fill('Nicosia')

    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/admin\/crm\/contacts\/\d+/, { timeout: 15_000 })
    const urlMatch = page.url().match(/\/admin\/crm\/contacts\/(\d+)/)
    expect(urlMatch, 'Redirect zur Detail-Page mit ID erwartet').not.toBeNull()
    ctx.contactId = parseInt(urlMatch![1], 10)

    await page.waitForLoadState('networkidle')

    // SOURCED-Badge visible (LifecycleBadge renders a <span> with the state label)
    const badge = page.locator('span', { hasText: /^Sourced$/ }).first()
    await expect(badge).toBeVisible({ timeout: 10_000 })

    // API-Verifikation: Source ist "manual"
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok, 'GET contact should return 200').toBe(true)
    const contact = res.data as {
      sources: Array<{ source: string }>
      lifecycle_state: string
      version: number
    }
    const manualSource = contact.sources.find((s) => s.source === 'manual')
    expect(manualSource, 'Contact should have source=manual').toBeDefined()
    expect(contact.lifecycle_state).toBe('SOURCED')
    ctx.contactVersion = contact.version
  })

  // ── AC2a: Edit — Stadt ändern ─────────────────────────────────────────────

  test('AC2a: Edit — Stadt ändern via ContactEditForm', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set from AC1').not.toBeNull()

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // ContactEditForm renders a button with tr.edit = "Edit"
    const editBtn = page.locator('button', { hasText: /^Edit$|^Bearbeiten$/ }).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    // Edit-Formular: city input has name="edit_city"
    const cityInput = page.locator('input[name="edit_city"]')
    await expect(cityInput).toBeVisible({ timeout: 5_000 })
    await cityInput.fill('Limassol')

    const saveBtn = page.locator('button[type="submit"]').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)

    // API-Verifikation: Stadt aktualisiert, kein State-Change
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { org: { city: string }; version: number; lifecycle_state: string }
    expect(contact.org.city).toBe('Limassol')
    expect(contact.lifecycle_state).toBe('SOURCED')
    ctx.contactVersion = contact.version
  })

  // ── AC2b: Channel hinzufügen ──────────────────────────────────────────────

  test('AC2b: Channel hinzufügen via ChannelEditor', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // Ensure contact has only 1 channel (email) before this test runs
    // (Previous test-run leftovers could have added channels already)
    const preCheck = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(preCheck.ok).toBe(true)
    const preCh = (preCheck.data as { channels: Array<{ id: number; kind: string }> }).channels
    // If phone already exists (leftover), remove all phone channels via API
    for (const ch of preCh.filter((c) => c.kind === 'phone_call')) {
      const ver = await getContactVersion(ctx.contactId!)
      await apiFetch('DELETE', `/api/v1/admin/crm/contacts/${ctx.contactId}/channels/${ch.id}`)
        .catch(() => {/* ignore if only 1 channel remains */})
      ctx.contactVersion = ver
    }
    // Reload after potential cleanup
    await page.reload()
    await page.waitForLoadState('networkidle')

    // ChannelEditor: "+ Add channel" button
    const addBtn = page.locator('button', { hasText: /Add channel|Kanal hinzufügen/ }).first()
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // The inline add-form is a <form> element inside ChannelEditor
    // It contains a <select> (kind) and a plain <input type="text"> (value)
    // Scope all interactions to the form to avoid matching unrelated elements
    const addForm = page.locator('form').last()  // the add-form is the last form in the DOM
    await expect(addForm).toBeVisible({ timeout: 5_000 })

    // Kind select — choose phone
    const kindSelect = addForm.locator('select').first()
    await expect(kindSelect).toBeVisible({ timeout: 5_000 })
    await kindSelect.selectOption('phone')
    // Verify selection took effect
    await expect(kindSelect).toHaveValue('phone')

    // Value input — fill phone number (placeholder will be "+357 99…" after react re-render)
    const valueInput = addForm.locator('input[type="text"]').first()
    await expect(valueInput).toBeVisible({ timeout: 5_000 })
    await valueInput.fill(PHONE)

    // Submit the add-form
    const submitBtn = addForm.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible({ timeout: 5_000 })
    await submitBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)

    // API-Verifikation: phone channel now exists
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as {
      channels: Array<{ id: number; kind: string; value_normalized: string }>
      version: number
    }
    const phoneChannel = contact.channels.find((c) => c.kind === 'phone_call')
    expect(phoneChannel, 'Phone channel should be added').toBeDefined()
    expect(contact.channels.length).toBeGreaterThanOrEqual(2)
    ctx.contactVersion = contact.version
  })

  // ── AC2d: Channel entfernen ───────────────────────────────────────────────

  test('AC2d: Channel entfernen — email-Kanal weg, phone bleibt', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // Verify 2+ channels exist before trying to remove
    const preCheck = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    const preCh = (preCheck.data as { channels: Array<{ kind: string }> }).channels
    expect(preCh.length, 'Need 2+ channels for remove test').toBeGreaterThanOrEqual(2)
    expect(preCh.find((c) => c.kind === 'email'), 'Email channel must exist').toBeDefined()

    // ChannelEditor renders a <table>. Find the row containing the email address.
    // ch.value_normalized appears in the 2nd <td> (font-mono text-xs)
    const emailRow = page.locator('tr').filter({ hasText: EMAIL }).first()
    await expect(emailRow).toBeVisible({ timeout: 10_000 })

    // The remove button is a "×" button in the last td of the row
    const removeBtn = emailRow.locator('button').filter({ hasText: '×' }).first()
    await expect(removeBtn).toBeVisible({ timeout: 5_000 })
    await expect(removeBtn).toBeEnabled({ timeout: 5_000 })
    await removeBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)

    // API-Verifikation: email-Kanal weg, phone-Kanal bleibt
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { channels: Array<{ id: number; kind: string }>; version: number }
    const emailChannel = contact.channels.find((c) => c.kind === 'email')
    expect(emailChannel, 'Email channel should be removed').toBeUndefined()
    const phoneChannel = contact.channels.find((c) => c.kind === 'phone_call')
    expect(phoneChannel, 'Phone channel should remain').toBeDefined()
    ctx.contactVersion = contact.version
  })

  // ── Confirm Business ──────────────────────────────────────────────────────

  test('Stufe0: Confirm Business → business_status=confirmed', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Confirm business" Button (tr.crm_action_confirm_business = "Confirm business")
    const confirmBtn = page.locator('button', { hasText: /Confirm business|Business bestätigen/ }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
    await confirmBtn.click()

    // ConfirmDialog (role="dialog")
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Confirm-Button inside dialog
    const confirmInDialog = dialog.locator('button', { hasText: /Confirm business|Business bestätigen/ }).first()
    await expect(confirmInDialog).toBeVisible({ timeout: 5_000 })
    await confirmInDialog.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)

    // API-Verifikation: business_status=confirmed
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { org: { business_status: string }; version: number }
    expect(contact.org.business_status).toBe('confirmed')
    ctx.contactVersion = contact.version
  })

  // ── Suppress → HARD_OPTOUT ────────────────────────────────────────────────

  test('Stufe0: Suppress → HARD_OPTOUT → Terminal-State, keine Action-Buttons', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.goto(`${BASE_URL}/admin`)
    await setCookie(page)
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Suppress / Opt-out" Button (tr.crm_action_suppress = "Suppress / Opt-out")
    const suppressBtn = page.locator('button', { hasText: /Suppress|Opt-out|Unterdrücken/ }).first()
    await expect(suppressBtn).toBeVisible({ timeout: 10_000 })
    await suppressBtn.click()

    // Suppress dialog
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // hard_optout is preselected — confirm directly
    const suppressConfirmBtn = dialog.locator('button', { hasText: /Suppress|Opt-out|Unterdrücken/ }).first()
    await expect(suppressConfirmBtn).toBeVisible({ timeout: 5_000 })
    await suppressConfirmBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)

    // Terminal-State-Meldung (ContactDetailActions: isTerminal → <p>...terminal state...</p>)
    const terminalMsg = page.locator('p', { hasText: /terminal state/i }).first()
    await expect(terminalMsg).toBeVisible({ timeout: 10_000 })

    // No lifecycle buttons visible in terminal state
    const confirmBusBtn = page.locator('button', { hasText: /Confirm business|Business bestätigen/ })
    await expect(confirmBusBtn).not.toBeVisible({ timeout: 3_000 })

    const setStateBtn = page.locator('button', { hasText: /Set state|Status setzen/ })
    await expect(setStateBtn).not.toBeVisible({ timeout: 3_000 })

    // API-Verifikation: HARD_OPTOUT
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { lifecycle_state: string }
    expect(contact.lifecycle_state).toBe('HARD_OPTOUT')
  })

  // ── Teardown ─────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    if (ctx.contactId) {
      const version = await getContactVersion(ctx.contactId).catch(() => ctx.contactVersion)
      await apiFetch('POST', `/api/v1/admin/crm/contacts/${ctx.contactId}/suppress`, {
        reason: 'hard_optout',
        version,
      }).catch(() => { /* ignore — already suppressed */ })
    }
  })
})
