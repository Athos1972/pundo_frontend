/**
 * Journey: CRM-Outreach-Mail → Opt-out (B8950-016 T31/T32)
 * Runbook: e2e/journeys/crm-opt-out.md
 *
 * Wirkung statt Durchlauf: die Mail kommt wirklich im Mail-Sink an (echte SMTP-Unterhaltung), ihre Teile, Links und
 * Bilder werden geprueft, der Abmelde-Link aus der Mail wird im Browser geoeffnet, und die Unterdrueckung steht danach
 * in der Datenbank.
 *
 * Fixtures: Kontakt `E2E OptOut {uuid}` mit E-Mail `e2e-optout-{uuid}@test-e2e.invalid` (Kanal-Adresse, kein echtes Postfach).
 * Cleanup: der Kontakt endet in HARD_OPTOUT (Terminal-State), CRM hat kein DELETE.
 */
import { test, expect } from '../fixtures'
import { randomUUID } from 'crypto'
import { adminLogin, adminHeaders, apiFetch } from './_helpers'
import { waitForMail } from './_helpers/mail-sink'
import { psql } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests duerfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const EMAIL = `e2e-optout-${UUID}@test-e2e.invalid`
const ctx = { token: null as string | null, contactId: 0 }
const adminFetch = (method: string, urlPath: string, body?: unknown) =>
  apiFetch(method, urlPath, body, adminHeaders(ctx.token))

test.describe.serial('CRM outreach mail → opt-out', () => {
  test('AC1: outreach mail arrives in the sink as multipart with real links and images', async () => {
    test.setTimeout(90_000)
    ctx.token = await adminLogin()
    const created = await adminFetch('POST', '/api/v1/admin/crm/contacts/ingest', {
      org: { name: `E2E OptOut ${UUID}` },
      contact: { display_name: 'Eleni' },
      channels: [{ kind: 'email', value: EMAIL }],
      source: { source: 'business_card' },
    })
    expect(created.ok).toBe(true)
    const contact = created.data as { id: number; version: number }
    ctx.contactId = contact.id
    expect((await adminFetch('POST', `/api/v1/admin/crm/contacts/${contact.id}/confirm-business`, { version: contact.version })).ok).toBe(true)

    const preview = await adminFetch('POST', `/api/v1/admin/crm/contacts/${contact.id}/outreach/preview`, { language: 'en', template_id: 'first_contact_email' })
    expect(preview.ok).toBe(true)
    const { subject, body_rendered } = preview.data as { subject: string; body_rendered: string }
    const sent = await adminFetch('POST', `/api/v1/admin/crm/contacts/${contact.id}/outreach/send`, {
      language: 'en', subject, body: body_rendered, idempotency_key: `e2e-optout-${UUID}`,
    })
    expect(sent.ok, 'outreach/send must succeed against the sink (SMTP_HOST of the test instance)').toBe(true)

    const mail = await waitForMail(EMAIL)
    expect(mail.subject).toBe(subject)
    expect(mail.from).toContain('care@pundo.cy')
    expect(mail.text, 'plain-text part').toBeTruthy()
    expect(mail.html, 'html part').toBeTruthy()
    expect(mail.listUnsubscribe).toMatch(/^<http.+\/crm\/opt-out\?token=.+>$/)
    expect(mail.html).toContain('/crm/opt-out?token=')
    // the links point at the TEST frontend (CRM_OPTOUT_BASE_URL_* in start_test_server.sh), never at the live domain
    expect(mail.listUnsubscribe).toContain('localhost:3500')

    // images: absolute URLs that really deliver an image
    expect(mail.imageUrls.length).toBeGreaterThanOrEqual(1)
    for (const url of mail.imageUrls) {
      expect(url, 'image url must be absolute https').toMatch(/^https:\/\//)
      const res = await fetch(url, { method: 'HEAD' })
      expect(res.status, `image ${url}`).toBe(200)
      expect(res.headers.get('content-type') ?? '', `image ${url}`).toMatch(/^image\//)
    }
  })

  test('AC2: the unsubscribe link from the mail records the opt-out (suppression in the database)', async ({ page }) => {
    test.setTimeout(60_000)
    const mail = await waitForMail(EMAIL)
    const link = mail.listUnsubscribe!.replace(/^<|>$/g, '')
    expect(psql(`select lifecycle_state from crm_contact where id=${ctx.contactId}`)).toBe('CONTACTED')

    await page.goto(`${link}&lang=en`) // the page reads the browser language otherwise (Playwright locale is el)
    await page.getByRole('button', { name: /confirm unsubscribe/i }).click() // R5: no auto-POST on load
    await expect(page.locator('.bg-green-50')).toBeVisible({ timeout: 10_000 })

    // effect, not just the confirmation text: contact is terminal and the channel is suppressed
    await expect.poll(() => psql(`select lifecycle_state from crm_contact where id=${ctx.contactId}`), { timeout: 10_000 }).toBe('HARD_OPTOUT')
    expect(Number(psql(`select count(*) from crm_interaction where contact_id=${ctx.contactId} and kind='suppression'`))).toBeGreaterThan(0)
  })
})
