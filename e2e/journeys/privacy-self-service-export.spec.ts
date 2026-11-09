/** F6110 R6: live customer export, ownership and expiry in the slot environment. */
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test, expect } from '../fixtures'
import { BACKEND_URL, BASE_URL } from '../env'
import { waitForMail } from './_helpers/mail-sink'

type Customer = { email: string; token: string }

async function customer(): Promise<Customer> {
  const email = `e2e-privacy-${randomUUID().slice(0, 10)}@pundo.com`
  const response = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'PrivacyExport!99', display_name: 'Privacy Export' }),
  })
  expect(response.status, await response.text()).toBe(201)
  const token = (response.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
  expect(token).not.toBe('')
  return { email, token }
}

async function signedContext(browser: import('@playwright/test').Browser, value: Customer, lang: 'de' | 'he') {
  const context = await browser.newContext({ baseURL: BASE_URL })
  const domain = new URL(BASE_URL).hostname
  await context.addCookies([
    { name: 'customer_token', value: value.token, domain, path: '/', httpOnly: true, sameSite: 'Lax' },
    { name: 'app_lang', value: lang, domain, path: '/' },
  ])
  return context
}

function zipContents(file: string): { manifest: { categories: string[] }; data: { categories: Record<string, unknown> } } {
  const python = `${process.env.BACKEND_REPO}/.venv/bin/python`
  const source = "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({'manifest':json.loads(z.read('manifest.json')), 'data':json.loads(z.read('data.json'))}))"
  return JSON.parse(execFileSync(python, ['-I', '-c', source, file], { encoding: 'utf8' })) as ReturnType<typeof zipContents>
}

test('customer export is visible, mail-safe, downloadable only by its owner and expires in German', async ({ browser }, testInfo) => {
  const owner = await customer()
  const other = await customer()
  const ownerContext = await signedContext(browser, owner, 'de')
  const ownerPage = await ownerContext.newPage()
  try {
    await ownerPage.goto('/account')
    await ownerPage.getByRole('tab', { name: 'Datenkopie' }).click()
    await ownerPage.getByRole('button', { name: 'Kopie meiner Daten anfordern' }).click()
    const link = ownerPage.getByRole('link', { name: 'Dein Export ist bereit.' })
    await expect(link).toBeVisible()
    const exportId = (await link.getAttribute('href'))?.split('/').at(-2)
    expect(exportId).toBeTruthy()

    const mail = await waitForMail(owner.email)
    expect(`${mail.subject}\n${mail.text ?? ''}`).toContain('data copy')
    expect(`${mail.text ?? ''}${mail.html ?? ''}`).not.toMatch(/https?:\/\//)
    expect(`${mail.text ?? ''}${mail.html ?? ''}`).not.toContain(exportId!)

    const [download] = await Promise.all([ownerPage.waitForEvent('download'), link.click()])
    const zip = testInfo.outputPath('privacy-export-de.zip')
    await download.saveAs(zip)
    const contents = zipContents(zip)
    expect(contents.manifest.categories).toEqual(expect.arrayContaining(['customer_account', 'customer_reviews', 'customer_activity']))
    expect((contents.data.categories.customer_account as { email: string }).email).toBe(owner.email)

    const otherContext = await signedContext(browser, other, 'de')
    const otherPage = await otherContext.newPage()
    try {
      await otherPage.goto('/account')
      const foreign = await otherPage.evaluate(async ({ id }) => (await fetch(`/api/customer/customer/privacy-requests/exports/${id}/download`)).status, { id: exportId })
      expect(foreign).toBe(404)
    } finally { await otherContext.close() }

    const expired = await ownerPage.evaluate(async ({ id }) => (await fetch(`/api/customer/customer/privacy-requests/exports/${id}/test-expire`, { method: 'POST' })).status, { id: exportId })
    expect(expired).toBe(200)
    const denied = await ownerPage.evaluate(async ({ id }) => (await fetch(`/api/customer/customer/privacy-requests/exports/${id}/download`)).status, { id: exportId })
    expect(denied).toBe(410)
    await ownerPage.reload()
    await ownerPage.getByRole('tab', { name: 'Datenkopie' }).click()
    await expect(ownerPage.getByRole('status')).toHaveText('Dein Export ist abgelaufen.')
  } finally { await ownerContext.close() }
})

test('customer export privacy tab renders in Hebrew RTL', async ({ browser }) => {
  const owner = await customer()
  const context = await signedContext(browser, owner, 'he')
  const page = await context.newPage()
  try {
    await page.goto('/account')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByRole('tab', { name: 'עותק נתונים' }).click()
    await page.getByRole('button', { name: 'בקשת עותק של הנתונים שלי' }).click()
    await expect(page.getByRole('link', { name: 'הייצוא מוכן.' })).toBeVisible()
  } finally { await context.close() }
})

test.fixme('Runde C: T6 Shop-Besitzer-Selbstbedienung fehlt.', async () => {})
