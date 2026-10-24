/**
 * F7600 Stufe 3 + Nachlauf "Suchen statt ID tippen" (Spec 2026-10-24-crm-person-org-search):
 * person -> two organisation roles chosen by SEARCH -> contact linked by SEARCH -> role end.
 *
 * Fixtures (separate, exclusive states; all names carry the run id, no pundo_test content is assumed):
 *   - `E2E Bakery <run>` in Nicosia   : same name as the next one, tells the city apart (AC5) and is the owner role (AC1, AC2)
 *   - `E2E Bakery <run>` in Limassol  : same name, other city (AC5)
 *   - `E2E Person Org <run> two`      : second role "it"
 *   - person `E2E Person <run>` with an e-mail identifier, created through the UI
 * Fehlerpfad (AC9): mock answers with the RECORDED backend response e2e/fixtures/contracts/admin-crm-orgs-search-too-short.json;
 * the "Real backend" test compares the real answer with the same file.
 */
import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { adminHeaders, adminLogin, apiFetch } from './_helpers'
import { expectRealMatchesContract, fulfillFrom } from './_helpers/contracts'
import { BASE_URL, BACKEND_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) throw new Error('Safety: F7600 Stufe 3 uses only 3500/8500.')

const run = randomUUID().slice(0, 8)
const bakery = `E2E Bakery ${run}`
const ctx = { token: '' as string, personId: 0, contactIds: [] as number[], orgIds: [] as number[] }
const api = (method: string, path: string, body?: unknown) => apiFetch(method, path, body, adminHeaders(ctx.token))

const FIXTURE_ORGS = [
  { name: bakery, city: 'Nicosia', suffix: 'nic' },
  { name: bakery, city: 'Limassol', suffix: 'lim' },
  { name: `E2E Person Org ${run} two`, city: 'Nicosia', suffix: 'two' },
]

test.describe.serial('F7600 CRM Stufe 3 — people and roles by search', () => {
  test.beforeAll(async () => {
    ctx.token = await adminLogin()
    for (const org of FIXTURE_ORGS) {
      const created = await api('POST', '/api/v1/admin/crm/contacts/ingest', {
        org: { name: org.name, city: org.city },
        contact: { display_name: `E2E Contact ${org.suffix}` },
        channels: [{ kind: 'email', value: `e2e-person-${run}-${org.suffix}@example.cy` }],
        source: { source: 'manual' },
      })
      expect(created.status, JSON.stringify(created.data)).toBe(201)
      const data = created.data as { id: number; org: { id: number } }
      ctx.contactIds.push(data.id); ctx.orgIds.push(data.org.id)
    }
    expect(new Set(ctx.orgIds).size, 'three distinct organisations').toBe(3)
  })

  test('Real backend: the too-short org search answers with the body the mocked test uses', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/crm/orgs?q=a`, { headers: adminHeaders(ctx.token) })
    expectRealMatchesContract('admin-crm-orgs-search-too-short', res.status, await res.json())
  })

  test('create the person', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/new`)
    await waitForPageHydrated(page)
    await page.getByLabel('Display name').fill(`E2E Person ${run}`)
    await page.getByLabel('Email address').fill(`e2e-person-${run}@example.cy`)
    await page.getByRole('button', { name: 'Add person' }).click()
    await page.waitForURL(/\/admin\/crm\/persons\/\d+/, { timeout: 15_000 })
    ctx.personId = Number(page.url().match(/\/persons\/(\d+)/)?.[1])
    expect(ctx.personId).toBeGreaterThan(0)
  })

  test('AC1/AC2/AC3/AC5: find the organisation by name, tell same names apart by city, role shows the name', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)

    // AC3: no free ID field, the organisation field is a Combobox button; Add role is disabled without a choice
    await expect(page.locator('#person-org')).toHaveJSProperty('tagName', 'BUTTON')
    await expect(page.locator('input[inputmode="numeric"]')).toHaveCount(0)
    const addRole = page.getByRole('button', { name: 'Add role' })
    await expect(addRole).toBeDisabled()

    await page.locator('#person-org').click()
    const search = page.getByRole('textbox', { name: 'Organisation' })
    await expect(page.getByText('Type at least 2 characters')).toBeVisible()
    const typedAt = Date.now()
    await search.fill(`Bakery ${run}`)
    const nicosia = page.getByRole('option', { name: new RegExp(`${bakery}.*Nicosia.*#${ctx.orgIds[0]}$`) })
    const limassol = page.getByRole('option', { name: new RegExp(`${bakery}.*Limassol.*#${ctx.orgIds[1]}$`) })
    await expect(nicosia).toBeVisible({ timeout: 2_000 }) // AC1: 2 s tolerance for gate load (spec E8); the measured time is noted below
    const tookMs = Date.now() - typedAt
    test.info().annotations.push({ type: 'AC1 search duration (ms)', description: String(tookMs) })
    console.log(`AC1: last keystroke -> hit visible after ${tookMs} ms`)
    await expect(limassol).toBeVisible() // AC5
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(2)

    await nicosia.click()
    await page.locator('#person-role').selectOption('owner')
    await expect(addRole).toBeEnabled()
    await addRole.click()
    await expect(page.getByText(new RegExp(`owner · ${bakery} \\(Nicosia\\)`))).toBeVisible()
    await expect(page.getByText(/Organisation #\d+/)).toHaveCount(0)

    // AC2: the effect in the data, not only on the screen
    await expect.poll(async () => {
      const detail = await api('GET', `/api/v1/admin/crm/persons/${ctx.personId}`)
      const roles = (detail.data as { roles: Array<{ org_id: number; org_name: string; role: string }> }).roles
      return roles.find((r) => r.role === 'owner')
    }, { timeout: 15_000 }).toMatchObject({ org_id: ctx.orgIds[0], org_name: bakery })

    // second role at the other organisation
    await page.locator('#person-org').click()
    await page.getByRole('textbox', { name: 'Organisation' }).fill(`Person Org ${run} two`)
    await page.getByRole('option', { name: new RegExp(`E2E Person Org ${run} two`) }).click()
    await page.locator('#person-role').selectOption('it')
    await addRole.click()
    await expect(page.getByText(new RegExp(`it · E2E Person Org ${run} two \\(Nicosia\\)`))).toBeVisible()
  })

  test('AC4/AC9: no hit shows "No results"; a failed search shows the readable error from the recorded response', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)
    await page.locator('#person-org').click()
    await page.getByRole('textbox', { name: 'Organisation' }).fill(`zzzzqq${run}`)
    await expect(page.getByText('No results')).toBeVisible()
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add role' })).toBeDisabled()

    await page.route('**/api/admin/crm/orgs**', (route) => route.fulfill(fulfillFrom('admin-crm-orgs-search-too-short')))
    await page.getByRole('textbox', { name: 'Organisation' }).fill('ab')
    await expect(page.locator('li[role="alert"]')).toHaveText('Enter at least 2 characters to search.')
    await expect(page.getByText('No results')).toHaveCount(0)
    // the form stays usable: the next input searches again
    await page.unroute('**/api/admin/crm/orgs**')
    await page.getByRole('textbox', { name: 'Organisation' }).fill(bakery)
    await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible()
  })

  test('AC7/AC8: link the contact by searching the person; under 3 characters nothing is requested', async ({ adminPage: page }) => {
    const personRequests: string[] = []
    page.on('request', (req) => { if (req.url().includes('/api/admin/crm/persons?')) personRequests.push(req.url()) })
    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactIds[0]}`)
    await waitForPageHydrated(page)
    await page.locator('#crm-person-search').click()
    const search = page.getByRole('textbox', { name: 'Person' })
    await search.fill('ab')
    await expect(page.getByText('Type at least 3 characters')).toBeVisible()
    await expect(page.getByText('person_search_too_short')).toHaveCount(0)
    expect(personRequests, 'no request below the minimum length').toHaveLength(0)

    await search.fill(`E2E Person ${run}`)
    const option = page.getByRole('option', { name: new RegExp(`E2E Person ${run}.*e2e-person-${run}@example\\.cy.*#${ctx.personId}$`) })
    await expect(option).toBeVisible()
    expect(personRequests.length, 'the search request was counted').toBeGreaterThan(0)
    await option.click()
    await page.getByRole('button', { name: 'Link person' }).click()
    await expect(page.getByRole('link', { name: `Linked person: E2E Person ${run}` })).toBeVisible()
    await expect.poll(async () => {
      const detail = await api('GET', `/api/v1/admin/crm/contacts/${ctx.contactIds[0]}`)
      return (detail.data as { person_id: number | null }).person_id
    }, { timeout: 15_000 }).toBe(ctx.personId)
  })

  test('end a role', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)
    await page.getByRole('button', { name: 'End role' }).first().click()
    await expect.poll(async () => {
      const detail = await api('GET', `/api/v1/admin/crm/persons/${ctx.personId}`)
      return (detail.data as { roles: Array<{ valid_to: string | null }> }).roles.some(role => role.valid_to !== null)
    }, { timeout: 15_000 }).toBe(true)
  })

  test.afterAll(async () => {
    if (ctx.personId) await api('DELETE', `/api/v1/admin/crm/persons/${ctx.personId}`)
  })
})
