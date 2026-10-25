/**
 * F7600 Stufe 3 + Nachlauf "Suchen statt ID tippen" (Spec 2026-10-24-crm-person-org-search), umgestellt auf den
 * Org-Schnitt (Spec 2026-10-25-crm-person-contact-modell, v3): person with first/last name (derived, read-only name),
 * salutation and birthday without year -> relations to organisations chosen by SEARCH, roles without dates (0..n,
 * "Role missing") -> contact person added on the organisation page by searching the person -> preferred channel as a
 * reference to an organisation channel -> remove a role, end a relation.
 *
 * Fixtures (separate, exclusive states; all names carry the run id, no pundo_test content is assumed):
 *   - org `E2E Bakery <run>` in Nicosia   : same name as the next one, tells the city apart (AC5); relation with role owner (AC1, AC2)
 *   - org `E2E Bakery <run>` in Limassol  : same name, other city (AC5); the person is added here from the org page (AC7)
 *   - org `E2E Person Org <run> two`      : relation without role ("Role missing"), then role "it"
 *   - person `E2E Person <run>` with a personal e-mail, created through the UI
 * Fehlerpfad (AC9): mock answers with the RECORDED backend response e2e/fixtures/contracts/admin-crm-orgs-search-too-short.json;
 * the "Real backend" test compares the real answer of the search route the UI calls (`/orgs/search`) with the same file.
 */
import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { adminHeaders, adminLogin, apiFetch } from './_helpers'
import { expectRealMatchesContract, fulfillFrom } from './_helpers/contracts'
import { psql } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) throw new Error('Safety: F7600 Stufe 3 uses only test ports.')

const run = randomUUID().slice(0, 8)
const bakery = `E2E Bakery ${run}`
const personName = `E2E Person ${run}`
const personEmail = `e2e-person-${run}@example.cy`
const ctx = { token: '' as string, personId: 0, orgIds: [] as number[], orgEmailIds: [] as number[] }
const api = (method: string, path: string, body?: unknown) => apiFetch(method, path, body, adminHeaders(ctx.token))

const FIXTURE_ORGS = [
  { name: bakery, city: 'Nicosia', suffix: 'nic' },
  { name: bakery, city: 'Limassol', suffix: 'lim' },
  { name: `E2E Person Org ${run} two`, city: 'Nicosia', suffix: 'two' },
]

interface Relation { id: number; org: { id: number; name: string }; person: { id: number }; roles: string[]; role_missing: boolean; note: string | null; active: boolean; valid_to: string | null; preferred_channel_id: number | null }
interface Person { id: number; display_name: string; first_name: string | null; last_name: string | null; name_derived: boolean; salutation: string | null; birth_date: string | null; birth_year_unknown: boolean; channels: Array<{ kind: string; value_normalized: string; owner: { type: string } }>; relations: Relation[] }

async function person(): Promise<Person> {
  const res = await api('GET', `/api/v1/admin/crm/persons/${ctx.personId}`)
  expect(res.ok).toBe(true)
  return res.data as Person
}
const relationAt = async (orgId: number) => (await person()).relations.find((r) => r.org.id === orgId)

test.describe.serial('F7600 CRM — people, relations and roles by search (org cut)', () => {
  test.beforeAll(async () => {
    ctx.token = await adminLogin()
    for (const org of FIXTURE_ORGS) {
      const created = await api('POST', '/api/v1/admin/crm/orgs', {
        name: org.name, city: org.city, as_lead: false,
        channels: [{ kind: 'email', value: `e2e-person-${run}-${org.suffix}@example.cy` }],
        source: { source: 'manual' },
      })
      expect(created.status, JSON.stringify(created.data)).toBe(201)
      const data = created.data as { id: number; channels: Array<{ id: number }> }
      ctx.orgIds.push(data.id); ctx.orgEmailIds.push(data.channels[0].id)
    }
    expect(new Set(ctx.orgIds).size, 'three distinct organisations').toBe(3)
  })

  test('Real backend: the too-short org search answers with the body the mocked test uses', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/crm/orgs/search?q=a`, { headers: adminHeaders(ctx.token) })
    expectRealMatchesContract('admin-crm-orgs-search-too-short', res.status, await res.json())
  })

  test('v3: create the person from first and last name (derived read-only name), salutation, birthday without year', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/new`)
    await waitForPageHydrated(page)
    const name = page.getByLabel('Name', { exact: true })
    await expect(name).toBeEditable() // free name while no part is filled
    await page.getByLabel('First name').fill('E2E')
    await page.getByLabel('Last name').fill(`Person ${run}`)
    await expect(name).toHaveValue(personName)
    await expect(name).not.toBeEditable()
    await expect(page.getByText('Built from first and last name.')).toBeVisible()
    await page.getByLabel('Salutation').selectOption('ms')
    await page.getByLabel('Day').fill('14')
    await page.getByLabel('Month').selectOption({ label: 'March' })
    await page.getByLabel('Year unknown').check()
    await expect(page.getByLabel('Year', { exact: true })).toHaveCount(0)
    await page.getByLabel('Email address').fill(personEmail)
    await page.getByRole('button', { name: 'Add person' }).click()
    await page.waitForURL(/\/admin\/crm\/persons\/\d+$/, { timeout: 15_000 })
    ctx.personId = Number(page.url().match(/\/persons\/(\d+)$/)?.[1])
    expect(ctx.personId).toBeGreaterThan(0)

    // effect in the data: derived name, parts, salutation, placeholder year only with "year unknown", personal channel
    expect(await person()).toMatchObject({
      display_name: personName, first_name: 'E2E', last_name: `Person ${run}`, name_derived: true, salutation: 'ms',
      birth_date: '2000-03-14', birth_year_unknown: true,
      channels: [{ kind: 'email', value_normalized: personEmail, owner: { type: 'person' } }],
    })
    // on the page: one h1 with the name, the birthday without a year (never 2000, never an age)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(personName)
    await expect(page.getByTestId('person-birthday')).toHaveText('14 March')
  })

  test('AC1/AC2/AC3/AC5: find the organisation by name, tell same names apart by city, the relation shows the name and the role', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)

    // AC3: no free ID field, the organisation field is a Combobox button; "Add relation" is disabled without a choice
    // (scoped to the "add relation" form: the birthday fields of the master data form are numeric on purpose)
    await expect(page.locator('#person-org')).toHaveJSProperty('tagName', 'BUTTON')
    const relationForm = page.locator('form', { has: page.locator('#person-org') })
    await expect(relationForm.locator('input[inputmode="numeric"], input[type="number"]')).toHaveCount(0)
    const addRelation = page.getByRole('button', { name: 'Add relation' })
    await expect(addRelation).toBeDisabled()

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
    await page.getByRole('checkbox', { name: 'Owner' }).check() // roles have no dates any more (v3)
    await page.getByLabel('Note').fill('Region West')
    await expect(addRelation).toBeEnabled()
    await addRelation.click()

    // AC2: the effect in the data, not only on the screen
    await expect.poll(async () => relationAt(ctx.orgIds[0]), { timeout: 15_000 })
      .toMatchObject({ org: { id: ctx.orgIds[0], name: bakery }, roles: ['owner'], role_missing: false, note: 'Region West', active: true })
    const nicRelation = (await relationAt(ctx.orgIds[0]))!
    const card = page.getByTestId(`relation-${nicRelation.id}`)
    await expect(card.getByRole('link', { name: `${bakery} (Nicosia)` })).toHaveAttribute('href', `/admin/crm/orgs/${ctx.orgIds[0]}`)
    await expect(card.getByRole('button', { name: 'Remove role Owner' })).toBeVisible()
    await expect(card).toContainText('Region West')
    await expect(page.getByText(/Organisation #\d+/)).toHaveCount(0)

    // second relation, this time without a role: allowed (201), shown as "Role missing" (E22), then a role is added
    await page.locator('#person-org').click()
    await page.getByRole('textbox', { name: 'Organisation' }).fill(`Person Org ${run} two`)
    await page.getByRole('option', { name: new RegExp(`E2E Person Org ${run} two`) }).click()
    await addRelation.click()
    await expect.poll(async () => relationAt(ctx.orgIds[2]), { timeout: 15_000 }).toMatchObject({ roles: [], role_missing: true })
    const twoRelation = (await relationAt(ctx.orgIds[2]))!
    const twoCard = page.getByTestId(`relation-${twoRelation.id}`)
    await expect(twoCard.getByText('Role missing')).toBeVisible()
    await twoCard.locator(`#relation-${twoRelation.id}-role`).selectOption('it')
    await twoCard.getByRole('button', { name: 'Add role' }).click()
    await expect(twoCard.getByRole('button', { name: 'Remove role IT' })).toBeVisible()
    await expect(twoCard.getByText('Role missing')).toHaveCount(0)
    await expect.poll(async () => (await relationAt(ctx.orgIds[2]))?.roles, { timeout: 15_000 }).toEqual(['it'])
  })

  test('AC4/AC9: no hit shows "No results"; a failed search shows the readable error from the recorded response', async ({ adminPage: page }) => {
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)
    await page.locator('#person-org').click()
    await page.getByRole('textbox', { name: 'Organisation' }).fill(`zzzzqq${run}`)
    await expect(page.getByText('No results')).toBeVisible()
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add relation' })).toBeDisabled()

    await page.route('**/api/admin/crm/orgs/search**', (route) => route.fulfill(fulfillFrom('admin-crm-orgs-search-too-short')))
    await page.getByRole('textbox', { name: 'Organisation' }).fill('ab')
    await expect(page.locator('li[role="alert"]')).toHaveText('Enter at least 2 characters to search.')
    await expect(page.getByText('No results')).toHaveCount(0)
    // the form stays usable: the next input searches again
    await page.unroute('**/api/admin/crm/orgs/search**')
    await page.getByRole('textbox', { name: 'Organisation' }).fill(bakery)
    await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible()
  })

  test('AC7/AC8: add the person as contact person on the organisation page by search; under 3 characters nothing is requested', async ({ adminPage: page }) => {
    const personRequests: string[] = []
    page.on('request', (req) => { if (req.url().includes('/api/admin/crm/persons?')) personRequests.push(req.url()) })
    await page.goto(`${BASE_URL}/admin/crm/orgs/${ctx.orgIds[1]}`)
    await waitForPageHydrated(page)
    const relations = page.getByTestId('crm-org-relations')
    await expect(relations).toContainText('No contact persons yet.')
    await page.locator('#crm-person-search').click()
    const search = page.getByRole('textbox', { name: 'Person' })
    await search.fill('ab')
    await expect(page.getByText('Type at least 3 characters')).toBeVisible()
    await expect(page.getByText('person_search_too_short')).toHaveCount(0)
    expect(personRequests, 'no request below the minimum length').toHaveLength(0)

    await search.fill(personName)
    const option = page.getByRole('option', { name: new RegExp(`${personName}.*${personEmail.replace(/\./g, '\\.')}.*#${ctx.personId}$`) })
    await expect(option).toBeVisible()
    expect(personRequests.length, 'the search request was counted').toBeGreaterThan(0)
    await option.click()
    await relations.getByRole('checkbox', { name: 'Manager' }).check()
    await relations.getByRole('button', { name: 'Add contact person' }).click()

    await expect.poll(async () => relationAt(ctx.orgIds[1]), { timeout: 15_000 })
      .toMatchObject({ person: { id: ctx.personId }, roles: ['manager'], active: true })
    const relation = (await relationAt(ctx.orgIds[1]))!
    const card = relations.getByTestId(`relation-${relation.id}`)
    await expect(card.getByRole('link', { name: personName })).toHaveAttribute('href', `/admin/crm/persons/${ctx.personId}`)
    // the personal channel of the person is shown at the relation and marked "Personal"
    await expect(card.getByRole('list', { name: 'Personal' })).toContainText(personEmail)
    await expect(relations).toContainText('Active relations: 1')
  })

  test('v3: the preferred channel of a relation is a reference to an organisation channel, never a copy', async ({ adminPage: page }) => {
    const relation = (await relationAt(ctx.orgIds[0]))!
    const orgEmail = `e2e-person-${run}-nic@example.cy`
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)
    await page.getByTestId(`relation-${relation.id}`).getByLabel('Preferred channel').selectOption({ label: `${orgEmail} (Organisation)` })
    await expect.poll(async () => (await relationAt(ctx.orgIds[0]))?.preferred_channel_id, { timeout: 15_000 }).toBe(ctx.orgEmailIds[0])
    // still exactly one channel row for the value, owned by the organisation
    expect(psql(`select count(*) || '|' || min(org_id) from crm_channel where value_normalized = '${orgEmail}'`)).toBe(`1|${ctx.orgIds[0]}`)
  })

  test('remove a role and end a relation (roles have no dates; the relation period ends)', async ({ adminPage: page }) => {
    const two = (await relationAt(ctx.orgIds[2]))!
    const nic = (await relationAt(ctx.orgIds[0]))!
    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
    await waitForPageHydrated(page)

    const twoCard = page.getByTestId(`relation-${two.id}`)
    await twoCard.getByRole('button', { name: 'Remove role IT' }).click()
    await expect(twoCard.getByText('Role missing')).toBeVisible()
    await expect.poll(async () => (await relationAt(ctx.orgIds[2]))?.roles, { timeout: 15_000 }).toEqual([])

    const nicCard = page.getByTestId(`relation-${nic.id}`)
    await nicCard.getByRole('button', { name: 'End relation' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'End relation' }).click()
    await expect(nicCard.getByText('Ended', { exact: true })).toBeVisible()
    await expect(nicCard.getByRole('button', { name: 'End relation' })).toHaveCount(0) // history only, no controls
    await expect.poll(async () => relationAt(ctx.orgIds[0]), { timeout: 15_000 })
      .toMatchObject({ active: false, valid_to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), roles: ['owner'] })
  })

  test.afterAll(async () => {
    if (ctx.personId) await api('DELETE', `/api/v1/admin/crm/persons/${ctx.personId}`)
  })
})
