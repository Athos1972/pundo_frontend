import { readFile } from 'node:fs/promises'
import { test, expect } from '../fixtures'
import { BASE_URL } from '../env'
import { adminApi, e2eEmail } from './_helpers/test-data'
import { mailsTo, waitForMail } from './_helpers/mail-sink'

function fragment(mail: { text: string | null; html: string | null }): string {
  const match = `${mail.text ?? ''}\n${mail.html ?? ''}`.match(/#([A-Za-z0-9_-]{20,})/)
  if (!match) throw new Error('privacy mail did not contain a fragment token')
  return match[1]
}

test.describe('F6110 guest request to external export download', () => {
  test('opens the confirmation link in the browser, removes its fragment, and finds the exact case', async ({ page }) => {
    const email = e2eEmail('privacy-guest')
    await page.goto(`${BASE_URL}/de/privacy-request`)
    await page.getByLabel('E-Mail').fill(email)
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    const acknowledgement = page.getByRole('status')
    await expect(acknowledgement).toHaveText('Anfrage bestätigen')
    const confirmation = await waitForMail(email)
    const token = fragment(confirmation)
    await page.goto(`${BASE_URL}/de/privacy-request/confirm#${token}`)
    await expect(page.getByRole('heading')).toHaveText('Ihre Datenschutzanfrage wurde bestätigt.')
    await expect(page).toHaveURL(`${BASE_URL}/de/privacy-request/confirm`)

    const received = await waitForMail(email)
    const caseNumber = `${received.text ?? ''}\n${received.html ?? ''}`.match(/PR-[A-Z0-9-]+/)?.[0]
    expect(caseNumber).toBeTruthy()
    const listed = await adminApi<{ items: Array<{ id: string; case_number: string }> }>('GET', '/privacy-requests?brand=pundo&right=access')
    expect(listed.status).toBe(200)
    const caseId = listed.json.items.find(item => item.case_number === caseNumber)?.id
    expect(caseId).toBeTruthy()
    expect((await adminApi('POST', `/privacy-requests/${caseId}/generate-export`)).status).toBe(200)
    expect((await adminApi('POST', `/privacy-requests/${caseId}/release-export`)).status).toBe(200)
    const release = await waitForMail(email)
    await page.goto(`${BASE_URL}/de/privacy-request/download#${fragment(release)}`)
    const link = page.getByRole('link', { name: 'Datenkopie herunterladen' })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/api\/privacy\/privacy-exports\/[0-9a-f-]+\/download$/)
    const download = page.waitForEvent('download')
    await link.click()
    const downloaded = await download
    const zipPath = await downloaded.path()
    expect(zipPath).toBeTruthy()
    const zip = await readFile(zipPath!)
    expect(zip.includes(Buffer.from('manifest.json'))).toBe(true)
    expect(zip.includes(Buffer.from('data.json'))).toBe(true)
    await downloaded.cancel()
    expect((await page.goto(`${BASE_URL}${href}`))?.status()).toBe(410)
  })

  test('shows the same acknowledgement for unknown and rate-limited addresses without another mail', async ({ page }) => {
    const known = e2eEmail('privacy-limit')
    await page.goto(`${BASE_URL}/de/privacy-request`)
    await page.getByLabel('E-Mail').fill(known)
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    const acknowledgement = page.getByRole('status')
    const knownText = await acknowledgement.textContent()
    expect(knownText).toBeTruthy()
    await waitForMail(known)
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
      await expect(acknowledgement).toHaveText(knownText!)
    }
    const beforeLimit = mailsTo(known).length
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    await expect(acknowledgement).toHaveText(knownText!)
    await expect.poll(() => mailsTo(known).length).toBe(beforeLimit)

    await page.goto(`${BASE_URL}/de/privacy-request`)
    await page.getByLabel('E-Mail').fill(e2eEmail('privacy-unknown'))
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    await expect(page.getByRole('status')).toHaveText(knownText!)
  })

  test('shows an already-confirmed result when the same confirmation link is reopened', async ({ page }) => {
    const email = e2eEmail('privacy-repeat')
    await page.goto(`${BASE_URL}/de/privacy-request`)
    await page.getByLabel('E-Mail').fill(email)
    await page.getByRole('button', { name: 'Datenschutzanfrage absenden' }).click()
    const token = fragment(await waitForMail(email))
    const confirmationUrl = `${BASE_URL}/de/privacy-request/confirm#${token}`
    await page.goto(confirmationUrl)
    await expect(page.getByRole('heading')).toHaveText('Ihre Datenschutzanfrage wurde bestätigt.')
    await page.goto(`${BASE_URL}/de/privacy-request`)
    await page.goto(confirmationUrl)
    await expect(page.getByRole('heading')).toHaveText('Ihre Datenschutzanfrage wurde bereits bestätigt.')
  })

  test('Arabic public form retains RTL direction and same acknowledgement for unknown address', async ({ page }) => {
    await page.goto(`${BASE_URL}/ar/privacy-request`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByLabel('البريد الإلكتروني').fill(e2eEmail('privacy-unknown'))
    await page.getByRole('button', { name: 'إرسال طلب خصوصية' }).click()
    await expect(page.getByRole('status')).toBeVisible()
  })
})
