/**
 * Journey: CRM NEEDS_REVIEW Flow — Stufe 2 (F7600 CRM-Backbone Org-Schnitt)
 * Runbook: e2e/journeys/admin-crm-needs-review.md
 *
 * Seit dem Org-Schnitt haengt das Kartenbild als Beleg an der Quelle der Organisation
 * (`sources[].has_card_image`, Bild unter `/orgs/{org}/sources/{source}/card-image/{side}`), der Lead-Status an der Org.
 *
 * Covers:
 *   AK4  — NEEDS_REVIEW → SOURCED via Dialog "Set lead status"
 *   AK7  — Quelle ohne Kartenbild → kein CardImageViewer an der Quelle
 *   AK12 — "Confirm card" nur sichtbar, wenn eine Quelle ein Kartenbild hat
 *   v3   — Hinweis "Kanalzuordnung pruefen": Wert gehoert schon einer Person → Org ohne den Wert + offener Review-Eintrag,
 *          Hinweis auf der Org-Seite, Eintrag in der Pruefliste, "Done" schliesst ihn, der Hinweis verschwindet
 *
 * Setup-Strategie (kein Telegram-Bot/Ollama nötig):
 *   1. POST /orgs (Akquise-Ziel, Quelle manual) → SOURCED
 *   2. POST /orgs/{id}/lead SOURCED → NEEDS_REVIEW
 *   → Org im NEEDS_REVIEW-State ohne Kartenbild
 *
 * Fixtures (getrennt je ausschliessendem Zustand):
 * | Fixture-Name            | Was                                                     | Prueft                                   |
 * |-------------------------|---------------------------------------------------------|------------------------------------------|
 * | E2E NR {uuid}           | NEEDS_REVIEW, Quelle ohne Bild, kein Besitzkonflikt      | AK4, AK7, AK12, kein Pruefhinweis        |
 * | E2E NR Owner {uuid}     | Org mit Telefon + einer Mail, die schon einer Person gehoert | Hinweis "Kanalzuordnung pruefen"     |
 * | Person E2E NR {uuid}    | Person mit persoenlicher Mail                           | Besitzerin des Konfliktwerts             |
 *
 * Cleanup: Suppress (HARD_OPTOUT) beider Orgs — kein DELETE-Endpoint im CRM; Person geloescht; offener Review-Eintrag
 * (falls ein Test vorher abbricht) per API geschlossen.
 */

import { test, expect } from '../fixtures'
import { randomUUID } from 'crypto'
import { adminLogin, adminHeaders, apiFetch } from './_helpers'
import { BASE_URL, BACKEND_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'
import { psql } from './_helpers/test-data'

// Port-Safety — niemals gegen Produktiv-Ports laufen
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const ORG_NAME = `E2E NR ${UUID}`
const OWNER_ORG_NAME = `E2E NR Owner ${UUID}`
const PHONE_SUFFIX = parseInt(UUID.slice(0, 6), 16) % 900000 + 100000
const PHONE = `+357 97 ${PHONE_SUFFIX}`
const PHONE_2 = `+357 97 ${(PHONE_SUFFIX + 1) % 900000 + 100000}`
const PERSON_EMAIL = `e2e-nr-${UUID}@test-e2e.invalid`

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  orgId: null as number | null,
  ownerOrgId: 0,
  personId: 0,
  reviewId: 0,
}

interface OrgDetail {
  id: number
  lead: { state: string | null; version: number }
  sources: Array<{ id: number; has_card_image: { front: boolean; back: boolean } }>
  channels: Array<{ kind: string; value_normalized: string }>
  open_review_count: number
}
interface ReviewItem { id: number | null; kind: string; status: string; org: { id: number } | null; person: { id: number } | null; channel: { value_normalized: string } | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Admin-API-Aufruf mit Cookie `admin_token` (geteilter `apiFetch`/`adminHeaders` aus `_helpers`). */
const adminFetch = (method: string, urlPath: string, body?: unknown) =>
  apiFetch(method, urlPath, body, adminHeaders(ctx.adminToken))

async function getOrg(id: number): Promise<OrgDetail> {
  const res = await adminFetch('GET', `/api/v1/admin/crm/orgs/${id}`)
  expect(res.ok, `GET org ${id}: ${res.status}`).toBe(true)
  return res.data as OrgDetail
}

async function ownerConflictItem(): Promise<ReviewItem | undefined> {
  const res = await adminFetch('GET', '/api/v1/admin/crm/review?category=channel_owner&limit=200')
  expect(res.ok).toBe(true)
  return (res.data as { items: ReviewItem[] }).items.find((i) => i.org?.id === ctx.ownerOrgId)
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('CRM NEEDS_REVIEW Flow — Stufe 2 (org cut)', () => {

  test.beforeAll(async () => {
    test.setTimeout(60_000)

    ctx.adminToken = await adminLogin()

    // Org anlegen: SOURCED → NEEDS_REVIEW (2 API-Calls, kein Telegram/OCR nötig)
    const created = await adminFetch('POST', '/api/v1/admin/crm/orgs', {
      name: ORG_NAME, city: 'Paphos', as_lead: true,
      channels: [{ kind: 'phone', value: PHONE }],
      source: { source: 'manual' },
    })
    if (created.status !== 201) throw new Error(`Create failed: ${created.status} — ${JSON.stringify(created.data)}`)
    const org = created.data as OrgDetail
    ctx.orgId = org.id

    // Sanity-check: no source carries a card image (no Telegram bot involved)
    if (org.sources.some((s) => s.has_card_image.front || s.has_card_image.back)) {
      throw new Error(`Unexpected: a source has a card image after a manual create (${JSON.stringify(org.sources)})`)
    }

    // Transition: SOURCED → NEEDS_REVIEW
    const transRes = await adminFetch('POST', `/api/v1/admin/crm/orgs/${ctx.orgId}/lead`, {
      to_state: 'NEEDS_REVIEW',
      lead_version: org.lead.version,
    })
    if (!transRes.ok) throw new Error(`SOURCED→NEEDS_REVIEW transition failed: ${transRes.status} — ${JSON.stringify(transRes.data)}`)
    const transitioned = transRes.data as OrgDetail
    if (transitioned.lead.state !== 'NEEDS_REVIEW') {
      throw new Error(`Expected NEEDS_REVIEW, got ${transitioned.lead.state}`)
    }
  })

  // ── AK7 + AK12: kein Kartenbild an der Quelle, "Confirm card" fehlt ──

  test('AK7+AK12: Quelle ohne Kartenbild → kein CardImageViewer, kein "Confirm card"-Button', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set from beforeAll').not.toBeNull()
    const org = await getOrg(ctx.orgId!)

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    // NEEDS_REVIEW-Badge sichtbar
    await expect(page.locator('[data-lead-state="NEEDS_REVIEW"]')).toHaveText('Needs review', { timeout: 10_000 })

    // AK7: the source is listed under "Sources and proofs", but without a card image viewer
    await expect(page.getByRole('heading', { name: 'Sources and proofs' })).toBeVisible()
    expect(org.sources).toHaveLength(1)
    await expect(page.getByTestId(`crm-card-images-${org.sources[0].id}`)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Business Card Photos' })).toHaveCount(0)

    // AK12: "Confirm card" NICHT sichtbar (OrgLeadActions: only with a card image at a source)
    const actions = page.getByTestId('crm-lead-actions')
    await expect(actions.getByRole('button', { name: 'Confirm card' })).toHaveCount(0)

    // NEEDS_REVIEW hat gültige Übergänge → "Set lead status" und "Reject (private)" vorhanden
    await expect(actions.getByRole('button', { name: 'Set lead status' })).toBeVisible({ timeout: 5_000 })
    await expect(actions.getByRole('button', { name: 'Reject (private)' })).toBeVisible()

    // no owner conflict on this organisation → no "check channel assignment" hint (exclusive state of the other fixture)
    expect(org.open_review_count).toBe(0)
    await expect(page.getByText('Check channel assignment:')).toHaveCount(0)
  })

  // ── AK4: NEEDS_REVIEW → SOURCED via Dialog ───────────────────────────────

  test('AK4: NEEDS_REVIEW → SOURCED via "Set lead status"-Dialog', async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    expect(ctx.orgId, 'orgId must be set from beforeAll').not.toBeNull()

    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgId}`)
    await waitForPageHydrated(page)

    await page.getByTestId('crm-lead-actions').getByRole('button', { name: 'Set lead status' }).click()

    // Lead-Status-Dialog
    const dialog = page.getByRole('dialog', { name: 'Set lead status' })
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole('combobox', { name: 'Lead status' }).selectOption('SOURCED')
    await dialog.getByRole('button', { name: 'Save' }).click()

    // NEEDS_REVIEW-Badge weg, SOURCED-Badge sichtbar (wartet auf den Seiten-Refresh statt networkidle)
    await expect(page.locator('[data-lead-state="NEEDS_REVIEW"]')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('[data-lead-state="SOURCED"]')).toHaveText('Sourced', { timeout: 5_000 })

    // API-Verifikation: lead.state = SOURCED
    expect((await getOrg(ctx.orgId!)).lead.state).toBe('SOURCED')
  })

  // ── v3: Hinweis "Kanalzuordnung prüfen" ──────────────────────────────────

  test('v3: value owned by a person → org without it, hint "check channel assignment", review list closes it', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    const person = await adminFetch('POST', '/api/v1/admin/crm/persons', {
      first_name: 'E2E', last_name: `NR ${UUID}`, channels: [{ kind: 'email', value: PERSON_EMAIL }],
    })
    expect(person.status, JSON.stringify(person.data)).toBe(201)
    ctx.personId = (person.data as { id: number }).id

    const created = await adminFetch('POST', '/api/v1/admin/crm/orgs', {
      name: OWNER_ORG_NAME, as_lead: true, source: { source: 'manual' },
      channels: [{ kind: 'phone', value: PHONE_2 }, { kind: 'email', value: PERSON_EMAIL }],
    })
    expect(created.status, JSON.stringify(created.data)).toBe(201)
    const org = created.data as OrgDetail
    ctx.ownerOrgId = org.id
    // the value stays with its owner (one row per value): the org gets only the phone, plus an open review entry
    expect(org.channels.map((c) => c.kind)).toEqual(['phone_call'])
    expect(org.open_review_count).toBe(1)
    const item = await ownerConflictItem()
    expect(item).toMatchObject({ kind: 'channel_owner_conflict', status: 'open', person: { id: ctx.personId }, channel: { value_normalized: PERSON_EMAIL } })
    ctx.reviewId = item!.id!

    await page.goto(`${BASE_URL}/admin/crm/orgs/${org.id}`)
    await waitForPageHydrated(page)
    const hint = page.getByRole('status').filter({ hasText: 'Check channel assignment:' })
    await expect(hint).toBeVisible()
    await hint.getByRole('link', { name: 'Open the review list' }).click()
    await page.waitForURL(/\/admin\/crm\/review\?category=channel_owner$/)
    await waitForPageHydrated(page)

    const entry = page.getByTestId('crm-review-list').getByRole('listitem').filter({ has: page.getByRole('link', { name: OWNER_ORG_NAME }) })
    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText('Value already belongs to someone else')
    await expect(entry).toContainText(PERSON_EMAIL)
    await expect(entry.getByRole('link', { name: `E2E NR ${UUID}` })).toHaveAttribute('href', `/admin/crm/persons/${ctx.personId}`)
    await entry.getByRole('button', { name: 'Done' }).click()
    await expect(entry).toHaveCount(0, { timeout: 10_000 })

    // effect: the entry is resolved and the organisation no longer counts it; the hint is gone
    await expect.poll(async () => (await getOrg(org.id)).open_review_count, { timeout: 10_000 }).toBe(0)
    expect(psql(`select status || '|' || (resolved_at is not null) from crm_review_item where id=${ctx.reviewId}`)).toBe('resolved|true')
    expect(await ownerConflictItem(), 'the open list no longer contains the entry').toBeUndefined()
    await page.goto(`${BASE_URL}/admin/crm/orgs/${org.id}`)
    await waitForPageHydrated(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(OWNER_ORG_NAME)
    await expect(page.getByText('Check channel assignment:')).toHaveCount(0)
  })

  // ── Teardown ──────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    if (!ctx.adminToken) return
    if (ctx.reviewId && (await ownerConflictItem().catch(() => undefined))) {
      await adminFetch('POST', `/api/v1/admin/crm/review/${ctx.reviewId}/resolve`, { status: 'dismissed' }).catch(() => undefined)
    }
    if (ctx.personId) await adminFetch('DELETE', `/api/v1/admin/crm/persons/${ctx.personId}`).catch(() => undefined)
    for (const orgId of [ctx.orgId, ctx.ownerOrgId].filter((id): id is number => Boolean(id))) {
      const res = await adminFetch('GET', `/api/v1/admin/crm/orgs/${orgId}`)
      const org = res.data as OrgDetail
      if (!res.ok || org.lead.state === 'HARD_OPTOUT') continue
      await adminFetch('POST', `/api/v1/admin/crm/orgs/${orgId}/suppress`, {
        reason: 'hard_optout',
        lead_version: org.lead.version,
      }).catch(() => { /* ignore — may already be in terminal state */ })
    }
  })
})
