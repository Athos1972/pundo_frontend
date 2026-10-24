/** F7600 Stufe 3: person → two organisation roles → contact link → role end. */
import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { adminHeaders, adminLogin, apiFetch } from './_helpers'
import { BASE_URL, BACKEND_URL } from '../env'
import { waitForPageHydrated } from './_helpers/hydration'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) throw new Error('Safety: F7600 Stufe 3 uses only 3500/8500.')

const run = randomUUID().slice(0, 8)
const ctx = { token: '' as string, personId: 0, contactIds: [] as number[], orgIds: [] as number[] }
const api = (method: string, path: string, body?: unknown) => apiFetch(method, path, body, adminHeaders(ctx.token))

test.describe.serial('F7600 CRM Stufe 3 — people and roles', () => {
  test.beforeAll(async () => {
    ctx.token = await adminLogin()
    for (const suffix of ['one', 'two']) {
      const created = await api('POST', '/api/v1/admin/crm/contacts/ingest', {
        org: { name: `E2E Person Org ${run} ${suffix}`, city: 'Nicosia' },
        contact: { display_name: `E2E Contact ${suffix}` },
        channels: [{ kind: 'email', value: `e2e-person-${run}-${suffix}@example.cy` }],
        source: { source: 'manual' },
      })
      expect(created.status, JSON.stringify(created.data)).toBe(201)
      const data = created.data as { id: number; org: { id: number } }
      ctx.contactIds.push(data.id); ctx.orgIds.push(data.org.id)
    }
  })

  test('create person, add two roles, link contact and end a role', async ({ adminPage: page }) => {
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/crm/persons/new`)
    await waitForPageHydrated(page)
    await page.getByLabel('Display name').fill(`E2E Person ${run}`)
    await page.getByLabel('Email address').fill(`e2e-person-${run}@example.cy`)
    await page.getByRole('button', { name: 'Add person' }).click()
    await page.waitForURL(/\/admin\/crm\/persons\/\d+/, { timeout: 15_000 })
    ctx.personId = Number(page.url().match(/\/persons\/(\d+)/)?.[1])
    expect(ctx.personId).toBeGreaterThan(0)

    for (const [index, role] of ['owner', 'it'].entries()) {
      await page.locator('#person-org').fill(String(ctx.orgIds[index]))
      await page.locator('#person-role').selectOption(role)
      await page.getByRole('button', { name: 'Add role' }).click()
      await expect(page.getByText(new RegExp(`${role} · Org #${ctx.orgIds[index]}`))).toBeVisible()
    }

    await page.goto(`${BASE_URL}/admin/crm/contacts/${ctx.contactIds[0]}`)
    await waitForPageHydrated(page)
    await page.getByLabel('Person ID').fill(String(ctx.personId))
    await page.getByRole('button', { name: 'Link person' }).click()
    await expect(page.getByRole('link', { name: `Linked person: #${ctx.personId}` })).toBeVisible()

    await page.goto(`${BASE_URL}/admin/crm/persons/${ctx.personId}`)
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
