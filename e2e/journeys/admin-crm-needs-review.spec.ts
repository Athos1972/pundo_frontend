/**
 * Journey: CRM NEEDS_REVIEW Flow — Stufe 2
 * Runbook: e2e/journeys/admin-crm-needs-review.md
 *
 * Covers:
 *   AK4  — NEEDS_REVIEW → SOURCED via Lifecycle-Button ("Karte bestätigen" oder Set-State)
 *   AK7  — card_image_front_url=null → CardImageViewer nicht gerendert
 *   AK12 — "Karte bestätigen"-Button nur sichtbar wenn card_image_front_url gesetzt
 *
 * Setup-Strategie (kein Telegram-Bot/Ollama nötig):
 *   1. Ingest → SOURCED
 *   2. Lifecycle SOURCED → NEEDS_REVIEW via API
 *   → Ergibt Kontakt im NEEDS_REVIEW-State ohne card_image_front_url
 *
 * Cleanup: Suppress (HARD_OPTOUT) — kein DELETE-Endpoint im CRM.
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
const ORG_NAME = `E2E NR ${UUID}`
const PHONE_SUFFIX = parseInt(UUID.slice(0, 6), 16) % 900000 + 100000
const PHONE = `+357 97 ${PHONE_SUFFIX}`

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

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('CRM NEEDS_REVIEW Flow — Stufe 2', () => {

  test.beforeAll(async () => {
    test.setTimeout(60_000)

    ctx.adminToken = await adminApiLogin()

    // Kontakt anlegen: SOURCED → NEEDS_REVIEW (2 API-Calls, kein Telegram/OCR nötig)
    const ingestRes = await apiFetch('POST', '/api/v1/admin/crm/contacts/ingest', {
      org: { name: ORG_NAME, city: 'Paphos' },
      contact: { display_name: `NR Test ${UUID}` },
      channels: [{ kind: 'phone', value: PHONE }],
      source: { source: 'manual' },
    })
    if (!ingestRes.ok) throw new Error(`Ingest failed: ${ingestRes.status} — ${JSON.stringify(ingestRes.data)}`)

    const created = ingestRes.data as { id: number; version: number; card_image_front_url: string | null }
    ctx.contactId = created.id
    ctx.contactVersion = created.version

    // Sanity-check: card_image_front_url must be null (no Telegram bot involved)
    if (created.card_image_front_url !== null) {
      throw new Error(`Unexpected: card_image_front_url is not null after manual ingest (${created.card_image_front_url})`)
    }

    // Transition: SOURCED → NEEDS_REVIEW
    const transRes = await apiFetch('POST', `/api/v1/admin/crm/contacts/${ctx.contactId}/lifecycle`, {
      to_state: 'NEEDS_REVIEW',
      version: ctx.contactVersion,
    })
    if (!transRes.ok) throw new Error(`SOURCED→NEEDS_REVIEW transition failed: ${transRes.status} — ${JSON.stringify(transRes.data)}`)

    const transitioned = transRes.data as { lifecycle_state: string; version: number }
    if (transitioned.lifecycle_state !== 'NEEDS_REVIEW') {
      throw new Error(`Expected NEEDS_REVIEW, got ${transitioned.lifecycle_state}`)
    }
    ctx.contactVersion = transitioned.version
  })

  // ── AK7 + AK12: CardImageViewer nicht sichtbar, "Karte bestätigen" fehlt ──

  test('AK7+AK12: card_image_front_url=null → kein CardImageViewer, kein "Karte bestätigen"-Button', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set from beforeAll').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // NEEDS_REVIEW-Badge sichtbar
    const nrBadge = page.locator('span, div', { hasText: /Needs review|Prüfung erforderlich|NEEDS_REVIEW/i }).first()
    await expect(nrBadge).toBeVisible({ timeout: 10_000 })

    // AK7: CardImageViewer-Section NICHT vorhanden
    // The section renders only when card_image_front_url is set (page.tsx line 90)
    // CardImageViewer renders a section with the "Business Card Photos" / "Visitenkarten-Fotos" heading
    const cardImagesSection = page.locator('h2, h3', { hasText: /Business Card Photos|Visitenkarten-Fotos/i })
    await expect(cardImagesSection).not.toBeVisible({ timeout: 3_000 })

    // AK12: "Karte bestätigen" / "Confirm card" Button NICHT sichtbar
    // (ContactDetailActions: showConfirmCard requires card_image_front_url to be truthy)
    const confirmCardBtn = page.locator('button', { hasText: /Confirm card|Karte bestätigen/i })
    await expect(confirmCardBtn).not.toBeVisible({ timeout: 3_000 })

    // Lifecycle-Transition-Button MUSS vorhanden sein (NEEDS_REVIEW hat gültige Transitions)
    // NEEDS_REVIEW → SOURCED, QUEUED, UNREACHABLE etc. → "Set state" / "Status setzen" Button
    const setStateBtn = page.locator('button', { hasText: /Set state|Status setzen/i }).first()
    await expect(setStateBtn).toBeVisible({ timeout: 5_000 })
  })

  // ── AK4: NEEDS_REVIEW → SOURCED via Lifecycle-Dialog ─────────────────────

  test('AK4: NEEDS_REVIEW → SOURCED via "Set state"-Dialog', async ({ page }) => {
    test.setTimeout(60_000)
    expect(ctx.contactId, 'contactId must be set from beforeAll').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactId}`)
    await page.waitForLoadState('networkidle')

    // "Set state" / "Status setzen" Button klicken
    const setStateBtn = page.locator('button', { hasText: /Set state|Status setzen/i }).first()
    await expect(setStateBtn).toBeVisible({ timeout: 10_000 })
    await setStateBtn.click()

    // Lifecycle-Dialog erscheint
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // SOURCED aus Dropdown wählen
    const stateSelect = dialog.locator('select').first()
    await expect(stateSelect).toBeVisible({ timeout: 5_000 })
    await stateSelect.selectOption('SOURCED')

    // Bestätigen (Save / Speichern)
    const saveBtn = dialog.locator('button', { hasText: /Save|Speichern/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    // Warte auf Seiten-Refresh
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)

    // NEEDS_REVIEW-Badge weg, SOURCED-Badge sichtbar
    const nrBadge = page.locator('span, div', { hasText: /Needs review|Prüfung erforderlich/i })
    await expect(nrBadge).not.toBeVisible({ timeout: 5_000 })

    const sourcedBadge = page.locator('span, div', { hasText: /Sourced|Erfasst/i }).first()
    await expect(sourcedBadge).toBeVisible({ timeout: 5_000 })

    // API-Verifikation: lifecycle_state = SOURCED
    const res = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    expect(res.ok).toBe(true)
    const contact = res.data as { lifecycle_state: string; version: number }
    expect(contact.lifecycle_state).toBe('SOURCED')
    ctx.contactVersion = contact.version
  })

  // ── Teardown ──────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    if (!ctx.contactId) return

    // Aktuelle Version holen (kann von Test-Fehlern abweichen)
    const getRes = await apiFetch('GET', `/api/v1/admin/crm/contacts/${ctx.contactId}`)
    const currentVersion = getRes.ok
      ? (getRes.data as { version: number }).version
      : ctx.contactVersion

    await apiFetch('POST', `/api/v1/admin/crm/contacts/${ctx.contactId}/suppress`, {
      reason: 'hard_optout',
      version: currentVersion,
    }).catch(() => { /* ignore — may already be in terminal state */ })
  })
})
