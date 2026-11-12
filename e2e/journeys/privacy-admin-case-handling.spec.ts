import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { BASE_URL, BACKEND_URL, test, expect } from '../fixtures'
import { adminApi, e2eEmail, psql } from './_helpers/test-data'
import { mailsTo, waitForMail } from './_helpers/mail-sink'

function fragment(mail: { text: string | null; html: string | null }): string {
  const match = `${mail.text ?? ''}\n${mail.html ?? ''}`.match(/#([A-Za-z0-9_-]{20,})/)
  if (!match) throw new Error('privacy mail did not contain a fragment token')
  return match[1]
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const EDITOR_PASSWORD = 'F6110-J2-Editor!99'

interface EditorFixture { email: string; password: string }
interface CustomerFixture { email: string; password: string; token: string; caseId: string; caseNumber: string }

function sql(value: string): string {
  return value.replace(/'/g, "''")
}

function passwordHash(password: string): string {
  const python = path.join(BACKEND_REPO, '.venv', 'bin', 'python')
  return execFileSync(python, [
    '-c', 'from core.auth.password import hash_password; import sys; print(hash_password(sys.argv[1]))', password,
  ], { cwd: BACKEND_REPO, encoding: 'utf8' }).trim()
}

function createEditor(label: string, permissions: string[]): EditorFixture {
  const email = e2eEmail(`privacy-${label}`)
  const permissionsJson = JSON.stringify(permissions).replace(/'/g, "''")
  psql(
    `insert into admin_users (email, password_hash, role, permissions) values ` +
    `('${sql(email)}', '${sql(passwordHash(EDITOR_PASSWORD))}', 'editor', '${permissionsJson}'::jsonb)`,
  )
  return { email, password: EDITOR_PASSWORD }
}

async function loginThroughAdminUi(browser: Browser, editor: EditorFixture): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(editor.email)
  await page.getByLabel('Password').fill(editor.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  return { context, page }
}

async function confirmEmailCase(email: string, right: 'access' | 'erasure'): Promise<{ id: string; case_number: string }> {
  const created = await adminApi<{ id: string; case_number: string }>('POST', '/privacy-requests', {
    brand: 'pundo', right, email, language: 'en', received_at: new Date().toISOString(),
  })
  expect(created.status, `create ${right} case`).toBe(201)
  const confirmation = await waitForMail(email)
  const confirmed = await fetch(`${BACKEND_URL}/api/v1/privacy-requests/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: fragment(confirmation) }),
  })
  expect(confirmed.status, `confirm ${right} case`).toBe(200)
  return created.json
}

async function waitForNextMail(email: string, existingCount: number) {
  await expect.poll(() => mailsTo(email).length, { timeout: 15_000 }).toBeGreaterThan(existingCount)
  return waitForMail(email)
}

test.describe.serial('F6110 admin privacy casework', () => {
  let editorWithPrivacy: EditorFixture
  let editorWithoutPrivacy: EditorFixture
  let customer: CustomerFixture
  let erasureCompleted = false

  test.beforeAll(async () => {
    editorWithPrivacy = createEditor('editor-perm', ['privacy:read', 'privacy:write'])
    editorWithoutPrivacy = createEditor('editor-no-perm', [])

    const email = e2eEmail('privacy-erasure-review', 'pundo.com')
    const password = 'F6110-J2-Customer!99'
    const signup = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: 'F6110 J2 review customer' }),
    })
    expect(signup.status, 'review customer signup').toBe(201)
    const login = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    })
    expect(login.status, 'review customer login').toBe(200)
    const token = (login.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
    expect(token, 'review customer token').not.toBe('')
    const shopId = Number(psql('select id from shops order by id limit 1'))
    expect(shopId, 'shop fixture for customer review').toBeGreaterThan(0)
    const review = await fetch(`${BACKEND_URL}/api/v1/customer/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entity_type: 'shop', entity_id: shopId, stars: 5, comment: 'F6110 J2 erasure preview review' }),
    })
    expect(review.status, 'review fixture').toBe(201)
    const privacyCase = await confirmEmailCase(email, 'erasure')
    customer = { email, password, token, caseId: privacyCase.id, caseNumber: privacyCase.case_number }
  })

  test.afterAll(async () => {
    psql(`delete from admin_users where email in ('${sql(editorWithPrivacy.email)}', '${sql(editorWithoutPrivacy.email)}')`)
    if (!erasureCompleted) {
      psql(`delete from reviews where user_id = (select id from customer_users where email = '${sql(customer.email)}')`)
      psql(`delete from customer_users where email = '${sql(customer.email)}'`)
    }
  })

  test('creates an email case, confirms it, shows metrics and processes extension and correction', async ({ adminPage }) => {
    const email = e2eEmail('privacy-admin')
    const created = await adminApi<{ id: string }>('POST', '/privacy-requests', {
      brand: 'pundo', right: 'correction', email, language: 'el', received_at: new Date().toISOString(),
    })
    expect(created.status).toBe(201)
    const confirmation = await waitForMail(email)
    expect((await adminPage.request.post('/api/privacy/privacy-requests/confirm', { data: { token: fragment(confirmation) } })).status()).toBe(200)
    await adminPage.goto(`/admin/privacy-requests/${created.json.id}`)
    await adminPage.getByLabel('Reason').fill('complex')
    await adminPage.getByRole('button', { name: 'Extend deadline' }).click()
    await expect(adminPage.getByRole('status')).toHaveText('Action saved.')
    await adminPage.getByLabel('Reason').fill('corrected')
    await adminPage.getByLabel('Response message').fill('corrected through the browser')
    await adminPage.getByRole('button', { name: 'Record correction' }).click()
    await expect(adminPage.getByText('closed', { exact: true })).toBeVisible()
    const metrics = await adminApi<{ by_right: Record<string, number> }>('GET', '/privacy-metrics')
    expect(metrics.status).toBe(200)
    expect(metrics.json.by_right.correction).toBeGreaterThan(0)
    await adminPage.context().addCookies([{ name: 'app_lang', value: 'el', url: BASE_URL }])
    await adminPage.goto(`/admin/privacy-requests/${created.json.id}`)
    await expect(adminPage.getByText('Παραταθείσα προθεσμία', { exact: true })).toBeVisible()
    const extendedEvent = adminPage.locator('li').filter({ hasText: 'extend · done' })
    await expect(extendedEvent).toContainText('Επεξεργασία από')
    await expect(extendedEvent).toContainText(/\d{4}-\d{2}-\d{2}T/)
    await adminPage.context().addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
    await adminPage.reload()
    await expect(adminPage.getByText('Extended deadline', { exact: true })).toBeVisible()
    await expect(extendedEvent).toContainText('Processed by')
    await adminPage.goto('/admin/privacy-requests')
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('renders the EN administration page', async ({ adminPage }) => {
    await adminPage.goto('/admin/privacy-requests?brand=pundo')
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible()
    await adminPage.context().addCookies([{ name: 'app_lang', value: 'en', url: adminPage.url() }])
    await adminPage.reload()
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('editor without privacy permission cannot see cases and receives 403', async ({ browser }) => {
    const { context, page } = await loginThroughAdminUi(browser, editorWithoutPrivacy)
    try {
      await page.goto('/admin/privacy-requests')
      await expect(page.getByRole('link', { name: customer.caseNumber })).toHaveCount(0)
      const response = await page.request.get('/api/admin/privacy-requests')
      expect(response.status(), 'privacy case API for editor without permissions').toBe(403)
    } finally {
      await context.close()
    }
  })

  test('editor with privacy permissions sees preview but cannot execute erasure', async ({ browser }) => {
    const { context, page } = await loginThroughAdminUi(browser, editorWithPrivacy)
    try {
      await page.goto('/admin/privacy-requests')
      await expect(page.getByRole('link', { name: customer.caseNumber })).toBeVisible()
      await page.getByRole('link', { name: customer.caseNumber }).click()
      await expect(page.getByText(/customer_reviews: [1-9]/)).toBeVisible()
      await page.getByRole('button', { name: 'Preview' }).click()
      await expect(page.locator('li').filter({ hasText: 'previewed · done' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Execute erasure' })).toHaveCount(0)
      const response = await page.request.post(`/api/admin/privacy-requests/${customer.caseId}/execute-erasure`, {
        data: { confirmed: true, preview_revision: 'editor-must-not-execute' },
      })
      expect(response.status(), 'editor execute-erasure request').toBe(403)
    } finally {
      await context.close()
    }
  })

  test('superadmin executes a reviewed erasure only after browser confirmation', async ({ adminPage }) => {
    await adminPage.goto(`/admin/privacy-requests/${customer.caseId}`)
    await expect(adminPage.getByText(/customer_reviews: [1-9]/)).toBeVisible()
    await adminPage.getByRole('button', { name: 'Preview' }).click()
    await expect(adminPage.getByRole('status')).toHaveText('Action saved.')
    const execute = adminPage.getByRole('button', { name: 'Execute erasure' })
    await expect(execute).toBeDisabled()
    const before = await adminApi<{ case: { status: string } }>('GET', `/privacy-requests/${customer.caseId}`)
    expect(before.json.case.status, 'case stays open without the confirmation checkbox').toBe('open')
    const customerStillExists = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customer.email, password: customer.password }),
    })
    expect(customerStillExists.status, 'customer remains before confirmation').toBe(200)
    await adminPage.getByLabel('I confirm the previewed erasure').check()
    await expect(execute).toBeEnabled()
    const executed = adminPage.waitForResponse(response =>
      response.request().method() === 'POST' && response.url().endsWith(`/api/admin/privacy-requests/${customer.caseId}/execute-erasure`),
    )
    await execute.click()
    expect((await executed).status(), 'browser erasure request').toBe(200)
    await expect(adminPage.getByText('closed', { exact: true })).toBeVisible()
    await expect(adminPage.getByRole('button', { name: 'Execute erasure' })).toHaveCount(0)
    const removedLogin = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customer.email, password: customer.password }),
    })
    expect(removedLogin.status, 'erased customer login').toBe(401)
    expect(psql(`select count(*) from customer_users where email = '${sql(customer.email)}'`)).toBe('0')
    erasureCompleted = true
  })

  test('superadmin rejects through the browser only with a reason and sends the complaint-right mail', async ({ adminPage }) => {
    const email = e2eEmail('privacy-decline')
    const privacyCase = await confirmEmailCase(email, 'access')
    const deliveredBefore = mailsTo(email).length
    await adminPage.goto(`/admin/privacy-requests/${privacyCase.id}`)
    await adminPage.getByRole('button', { name: 'Decline' }).click()
    await expect(adminPage.getByRole('status')).toHaveText('The action could not be completed.')
    await adminPage.getByLabel('Reason').fill('identity cannot be established')
    await adminPage.getByRole('button', { name: 'Decline' }).click()
    await expect(adminPage.getByText('rejected', { exact: true })).toBeVisible()
    const rejected = await waitForNextMail(email, deliveredBefore)
    expect(`${rejected.text ?? ''}\n${rejected.html ?? ''}`).toContain('Commissioner for Personal Data Protection')
  })

  test('superadmin sends the no-data response through the browser and closes its case', async ({ adminPage }) => {
    const email = e2eEmail('privacy-no-data')
    const privacyCase = await confirmEmailCase(email, 'access')
    const deliveredBefore = mailsTo(email).length
    await adminPage.goto(`/admin/privacy-requests/${privacyCase.id}`)
    await expect(adminPage.getByRole('button', { name: 'Preview' })).toHaveCount(0)
    await adminPage.getByRole('button', { name: 'Send no-data response' }).click()
    await expect(adminPage.getByText('closed', { exact: true })).toBeVisible()
    const noData = await waitForNextMail(email, deliveredBefore)
    expect(`${noData.text ?? ''}\n${noData.html ?? ''}`).toMatch(/found no personal data/i)
    await expect(adminPage.getByRole('button', { name: 'Send no-data response' })).toHaveCount(0)
  })
})
