/**
 * Journey: CRM Contact Lifecycle — Stufe 0+1
 * Runbook: e2e/journeys/admin-crm-contact-lifecycle.md
 *
 * Covers:
 *   AK1a — Source-Dropdown: "manual" wählbar, gespeicherter Kontakt hat source=manual
 *   AK1b — Default-Source: business_card vorausgewählt
 *   AK2a — Edit: Stadt ändern via ContactEditForm
 *   AK2b — Channel hinzufügen via ChannelEditor
 *   AK2d — Channel entfernen (2+ Kanäle) via ChannelEditor
 *   Stufe0 — Confirm Business → business_status=confirmed
 *   Stufe0 — Suppress → HARD_OPTOUT → Terminal-State (keine Buttons mehr)
 *
 * Fixtures:
 * | Fixture-Name          | Was wird aufgebaut           | Was wird geprüft                          |
 * |-----------------------|------------------------------|-------------------------------------------|
 * | E2E CRM {uuid}        | Kontakt via UI, source=manual| Create-Form + Source-Dropdown             |
 * | +357 96 {uuid-short}  | Zweiter Kanal via API        | ChannelEditor Add + Remove                |
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
// Phone number unique per run (last 6 digits from UUID hex)
const PHONE_SUFFIX = parseInt(UUID.slice(0, 6), 16) % 900000 + 100000
const PHONE = `+357 96 ${PHONE_SUFFIX}`

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  contactId: null as number | null,
  contactVersion: 1,
  channel1Id: null as number | null,
  channel2Id: null as number | null,
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

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('CRM Contact Lifecycle — Stufe 0+1', () => {











  // ── AC1a/AC1b: Kontakt anlegen via UI mit Source-Dropdown ─────────────────

  test('AC1a+AC1b: Kontakt anlegen via UI — Source-Dropdown "manual" + Default-Check', async ({ page }) => {
    test.setTimeout(90_000)

    // Cookie setzen
    await page.goto(`${BASE_URL}/admin`)
    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    // Navigiere zu /admin/crm/contacts/new
    await page.goto(`${BASE_URL}/admin/crm/contacts/new`)
    await page.waitForLoadState('networkidle')

    // Prüfe dass Seite korrekt lädt (h1 oder Formular sichtbar)
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // AC1b: Prüfe dass Source-Dropdown mit business_card vorausgewählt ist
    const sourceSelect = page.locator('select#source_select')
    await expect(sourceSelect).toBeVisible({ timeout: 5_000 })
    await expect(sourceSelect).toHaveValue('business_card')

    // AC1a: Quelle auf "manual" wechseln
    await sourceSelect.selectOption('manual')
    await expect(sourceSelect).toHaveValue('manual')

    // Formular füllen
    await page.locator('input[name="org_name"]').fill(ORG_NAME)
    await page.locator('input[name="email"]').fill(EMAIL)
    await page.locator('input[name="city"]').fill('Nicosia')

    // Absenden
    await page.locator('button[type="submit"]').click()

    // Warte auf Redirect zur Detail-Page
    await page.waitForURL(/\/admin\/crm\/contacts\/\d+/, { timeout: 15_000 })

    // Kontakt-ID aus URL extrahieren
    const urlMatch = page.url().match(/\/admin\/crm\/contacts\/(\d+)/)
    expect(urlMatch, 'Redirect zur Detail-Page mit ID erwartet').not.toBeNull()
    ctx.contactId = parseInt(urlMatch![1], 10)

    // Detail-Page: Status-Badge SOURCED sichtbar
    await page.waitForLoadState('networkidle')
    // The badge shows text "Sourced" (en) or "Erfasst" (de) — check for the lifecycle_state badge
    const badge = page.locator('[data-lifecycle-badge], .lifecycle-badge').first()
      .or(page.locator('span', { hasText: /Sourced|Erfasst|SOURCED/i }).first())
    await expect(badge).toBeVisible({ timeout: 10_000 })

    // API-Verifikation: Source ist "manual"
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok, 'GET contact should return 200').toBe(true)
    const contact = res.data as { sources: Array<{ source: string }>; lifecycle_state: string; version: number }
    const manualSource = contact.sources.find((s) => s.source === 'manual')
    expect(manualSource, 'Contact should have source=manual').toBeDefined()
    expect(contact.lifecycle_state).toBe('SOURCED')

    ctx.contactVersion = contact.version
    if (contact as { channels?: Array<{ id: number }> }) {
      const ch = (contact as { channels: Array<{ id: number }> }).channels
      if (ch.length > 0) ctx.channel1Id = ch[0].id
    }
  })

  // ── AC2a: Edit — Stadt ändern ─────────────────────────────────────────────

  test('AC2a: Edit — Stadt ändern via ContactEditForm', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set from AC1').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // Bearbeiten-Button finden und klicken
    // ContactEditForm: "Edit" or "Bearbeiten" button triggers inline form
    const editBtn = page.locator('button', { hasText: /Edit|Bearbeiten/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    // Edit-Formular erscheint — city input sichtbar
    const cityInput = page.locator('input[name="city"]')
    await expect(cityInput).toBeVisible({ timeout: 5_000 })
    await cityInput.fill('Limassol')

    // Speichern
    const saveBtn = page.locator('button[type="submit"]', { hasText: /Save|Speichern/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    // Warte auf Seiten-Refresh
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

    // API-Verifikation: Stadt aktualisiert
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { org: { city: string }; version: number; lifecycle_state: string }
    expect(contact.org.city).toBe('Limassol')
    expect(contact.lifecycle_state).toBe('SOURCED') // kein State-Change
    ctx.contactVersion = contact.version
  })

  // ── AC2b: Channel hinzufügen ──────────────────────────────────────────────

  test('AC2b: Channel hinzufügen via ChannelEditor', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Add channel" / "Kanal hinzufügen" Button finden
    const addChannelBtn = page.locator('button', { hasText: /Add channel|Kanal hinzufügen|Add/i }).first()
    await expect(addChannelBtn).toBeVisible({ timeout: 10_000 })
    await addChannelBtn.click()

    // Channel-Formular erscheint — kind=phone wählen + Wert eingeben
    const kindSelect = page.locator('select').filter({ hasText: /email|phone|E-Mail|Telefon/i }).first()
      .or(page.locator('select[name="kind"]').first())
    await expect(kindSelect).toBeVisible({ timeout: 5_000 })
    await kindSelect.selectOption('phone')

    const valueInput = page.locator('input[name="value"], input[placeholder*="phone"], input[type="tel"], input[placeholder*="+"]').first()
    await expect(valueInput).toBeVisible({ timeout: 5_000 })
    await valueInput.fill(PHONE)

    // Channel speichern
    const submitBtn = page.locator('button[type="submit"]', { hasText: /Add|Hinzufügen|Save|Speichern/i }).first()
    await expect(submitBtn).toBeVisible({ timeout: 5_000 })
    await submitBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

    // API-Verifikation: 2 Kanäle vorhanden
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { channels: Array<{ id: number; kind: string; value_normalized: string }>; version: number }
    expect(contact.channels.length).toBeGreaterThanOrEqual(2)

    const phoneChannel = contact.channels.find((c) => c.kind === 'phone')
    expect(phoneChannel, 'Phone channel should be added').toBeDefined()

    ctx.channel1Id = contact.channels.find((c) => c.kind === 'email')?.id ?? contact.channels[0].id
    ctx.channel2Id = phoneChannel?.id ?? contact.channels[1].id
    ctx.contactVersion = contact.version
  })

  // ── AC2d: Channel entfernen ───────────────────────────────────────────────

  test('AC2d: Channel entfernen — email-Kanal entfernen, Telefon bleibt', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()
    expect(ctx.channel1Id, 'channel1Id (email) must be set from AC2b').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // Kanal-Sektion: Entfernen-Button am E-Mail-Kanal (zeigt E-Mail-Adresse)
    // ChannelEditor rendert jeden Kanal mit einem Remove-Button (×, Entfernen, Remove)
    const channelSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /Channels|Kanäle/i }) })
    await expect(channelSection).toBeVisible({ timeout: 10_000 })

    // Find the email channel row (contains the email address) and its remove button
    const emailRow = channelSection.locator('li, tr, div[class*="flex"]')
      .filter({ hasText: EMAIL })
      .first()
    await expect(emailRow).toBeVisible({ timeout: 5_000 })

    const removeBtn = emailRow.locator('button', { hasText: /×|Remove|Entfernen/i }).first()
      .or(emailRow.locator('button[aria-label*="remove"], button[aria-label*="entfernen"], button[aria-label*="delete"]').first())
    await expect(removeBtn).toBeVisible({ timeout: 5_000 })
    await removeBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

    // API-Verifikation: email-Kanal weg, phone-Kanal bleibt
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { channels: Array<{ id: number; kind: string }>; version: number }
    const emailChannel = contact.channels.find((c) => c.kind === 'email')
    expect(emailChannel, 'Email channel should be removed').toBeUndefined()
    const phoneChannel = contact.channels.find((c) => c.kind === 'phone')
    expect(phoneChannel, 'Phone channel should remain').toBeDefined()
    ctx.contactVersion = contact.version
  })

  // ── Confirm Business ──────────────────────────────────────────────────────

  test('Stufe0: Confirm Business → business_status=confirmed', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Confirm business" / "Business bestätigen" Button
    const confirmBtn = page.locator('button', { hasText: /Confirm business|Business bestätigen/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
    await confirmBtn.click()

    // Confirm-Dialog erscheint
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Bestätigen
    const confirmInDialog = dialog.locator('button', { hasText: /Confirm business|Business bestätigen|confirm|OK/i }).first()
    await expect(confirmInDialog).toBeVisible({ timeout: 5_000 })
    await confirmInDialog.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

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

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Suppress / Opt-out" / "Unterdrücken" Button
    const suppressBtn = page.locator('button', { hasText: /Suppress|Opt-out|Unterdrücken/i }).first()
    await expect(suppressBtn).toBeVisible({ timeout: 10_000 })
    await suppressBtn.click()

    // Suppress-Dialog erscheint
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // hard_optout ist vorausgewählt — direkt bestätigen
    const suppressConfirmBtn = dialog.locator('button', { hasText: /Suppress|Opt-out|Unterdrücken/i }).first()
    await expect(suppressConfirmBtn).toBeVisible({ timeout: 5_000 })
    await suppressConfirmBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

    // Detail-Page: Terminal-State-Meldung sichtbar, keine Action-Buttons
    const terminalMsg = page.locator('p', { hasText: /terminal state|Terminal/i }).first()
    await expect(terminalMsg).toBeVisible({ timeout: 10_000 })

    // Keine Lifecycle-Buttons mehr
    const confirmBusBtn = page.locator('button', { hasText: /Confirm business|Business bestätigen/i })
    await expect(confirmBusBtn).not.toBeVisible({ timeout: 3_000 })

    const lifecycleBtn = page.locator('button', { hasText: /Set state|Status setzen/i })
    await expect(lifecycleBtn).not.toBeVisible({ timeout: 3_000 })

    // API-Verifikation: HARD_OPTOUT
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { lifecycle_state: string }
    expect(contact.lifecycle_state).toBe('HARD_OPTOUT')
  })

  // ── Teardown ─────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    // Sicherheits-Cleanup: Falls Kontakt noch nicht supprimiert ist
    if (ctx.contactId) {
      const version = await getContactVersion(ctx.contactId).catch(() => ctx.contactVersion)
      await apiFetch('POST', `/api/v1/admin/crm/contacts/${ctx.contactId}/suppress`, {
        reason: 'hard_optout',
        version,
      }).catch(() => { /* ignore — already suppressed */ })
    }
  })
})
