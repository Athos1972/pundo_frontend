/**
 * Journey: Review-Foto-Moderation ueber das LLM-Gateway (F3700)
 * Runbook: e2e/journeys/review-photo-moderation.md
 *
 * Kein echter Worker noetig. Die Kette Backend -> Gateway -> Webhook -> Backend ist echt; die Worker-Rolle spielt der
 * Test fuer genau die eigenen Tasks (Task-ID aus der DB, Antwort in der Huelle des echten Workers). Das Ueberfaellig-
 * Setup altert nur die selbst angelegten Fotos (`ageReviewPhoto`).
 *
 * Fixtures:
 * | Fixture        | Was wird aufgebaut                               | Was wird geprueft                                           |
 * |----------------|---------------------------------------------------|-------------------------------------------------------------|
 * | customer       | `e2e-<run>-photo-mod-<rand>@pundo.com`            | Upload, Statusendpoint                                      |
 * | spec-shop      | `specShop('PHMOD')`                               | Review-Ziel                                                 |
 * | photo-webhook  | Foto, Gateway-Ergebnis "abgelehnt" per Webhook    | AK 1, 3, 4: pending -> rejected, Audit `system`             |
 * | photo-overdue-a| Foto auf 40 min gealtert, Admin gibt frei (UI)    | AK 9: Tab, Freigabe, Audit `admin`, Status fuer Kundin      |
 * | photo-overdue-b| Foto auf 40 min gealtert, Admin lehnt ab (UI)     | AK 9: Ablehnung mit Kategorie, 409 bei zweiter Entscheidung |
 * | photo-fresh    | Foto frisch (0 min)                               | AK 9: erscheint NICHT in der Liste                          |
 *
 * Spaetes Gateway-Ergebnis nach Admin-Entscheidung (AK 8): widersprechend fuer das abgelehnte Foto (photo-overdue-b).
 */
import { test, expect } from '../fixtures'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { BASE_URL, BACKEND_URL } from '../env'
import { adminLogin } from './_helpers'
import { ageReviewPhoto, e2eEmail, psql, RUN_ID } from './_helpers/test-data'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { gatewaySkipReason, failTask, submitResult } from './_helpers/gateway-worker'
import {
  leaseTaskById, moderationResult, photoStatuses, uploadReviewPhoto, waitWebhookDelivered,
} from './_helpers/review-photo'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const EMAIL = e2eEmail('photo-mod', 'pundo.com')
const PASSWORD = `E2e-${UUID}-Aa1!`
const sql = (s: string) => s.replace(/'/g, "''")

interface Photo { id: number; taskId: string }
const ctx = {
  skip: null as string | null,
  token: '',
  adminToken: '',
  reviewId: 0,
  webhook: null as Photo | null,
  a: null as Photo | null,
  b: null as Photo | null,
  fresh: null as Photo | null,
}
let shop: WorkerShop
const steps: Array<{ step: string; desc: string; expected: string; actual: string; status: 'PASS' | 'FAIL' }> = []
const note = (step: string, desc: string, expected: string, actual: string) =>
  steps.push({ step, desc, expected, actual, status: 'PASS' })

const bearer = () => ({ Authorization: `Bearer ${ctx.token}` })
const adminHeaders = () => ({ Cookie: `admin_token=${ctx.adminToken}`, 'Content-Type': 'application/json' })

function dbPhoto(id: number) {
  const row = psql(
    `select status, coalesce(moderation_model,''), coalesce(moderated_by_admin_id::text,''), ` +
    `coalesce(moderation_categories::text,''), (moderation_task_id is not null), (moderation_requested_at is not null) ` +
    `from review_photos where id = ${Math.trunc(id)}`,
  ).split('|')
  return {
    status: row[0], model: row[1], adminId: row[2], categories: row[3],
    hasTask: row[4] === 't', hasRequestedAt: row[5] === 't',
  }
}
function auditRows(photoId: number): string[] {
  return psql(
    `select action || '/' || actor_type from review_audit_log where photo_id = ${Math.trunc(photoId)} order by id`,
  ).split('\n').filter(Boolean)
}
function taskIdOf(photoId: number): string {
  return psql(`select moderation_task_id from review_photos where id = ${Math.trunc(photoId)}`)
}
async function upload(shade: number): Promise<Photo> {
  const r = await uploadReviewPhoto(ctx.token, ctx.reviewId, shade)
  expect(r.status, `Upload: ${r.text}`).toBe(201)
  expect(r.photoStatus, 'neues Foto ist pending (Kundin ist nicht vertrauenswürdig)').toBe('pending')
  expect(r.photoId).not.toBeNull()
  const taskId = taskIdOf(r.photoId!)
  expect(taskId, 'Gateway-Auftrag am Foto vermerkt (Gateway erreichbar)').toMatch(/^[0-9a-f-]{36}$/)
  return { id: r.photoId!, taskId }
}
async function pollStatus(photoId: number, want: string, timeoutMs = 20_000): Promise<string> {
  const end = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < end) {
    last = (await photoStatuses(ctx.token, ctx.reviewId)).find(p => p.photo_id === photoId)?.status ?? 'missing'
    if (last === want) return last
    await new Promise(r => setTimeout(r, 400))
  }
  return last
}

test.describe.serial('Review-Foto-Moderation (F3700)', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000)
    ctx.skip = await gatewaySkipReason('moderate.review_photo')
    if (ctx.skip) return
    ctx.adminToken = await adminLogin()
    shop = await specShop('PHMOD')

    const signup = await fetch(`${BACKEND_URL}/api/v1/customer/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, display_name: `E2E Photo ${UUID}` }),
    })
    expect(signup.status, 'Signup').toBe(201)
    const login = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    expect(login.status, 'Login').toBe(200)
    ctx.token = (login.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
    expect(ctx.token, 'customer_token').not.toBe('')

    const rev = await fetch(`${BACKEND_URL}/api/v1/customer/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...bearer() },
      body: JSON.stringify({ entity_type: 'shop', entity_id: shop.id, stars: 5, comment: `E2E photo moderation ${UUID}` }),
    })
    expect(rev.status, 'Review anlegen').toBe(201)
    ctx.reviewId = ((await rev.json()) as { id: number }).id
  })

  test.afterAll(async () => {
    // Eigene Aufträge in der Gateway-Queue nicht liegen lassen (Test-Gateway, nur diese Task-IDs).
    if (!ctx.skip) {
      for (const p of [ctx.fresh]) {
        if (!p) continue
        const t = await leaseTaskById(p.taskId, 2_000).catch(() => null)
        if (t) {
          await failTask(t.task_id, 'e2e cleanup')
          await waitWebhookDelivered(p.taskId, 8_000) // Webhook vor dem Löschen der Foto-Zeile abwarten
        }
      }
      // Review samt Fotos entfernen; Kundin und Shop räumt der Teardown bzw. destroy().
      try {
        psql(`delete from review_audit_log where review_id = ${Math.trunc(ctx.reviewId)}`)
        psql(`delete from review_photos where review_id = ${Math.trunc(ctx.reviewId)}`)
        psql(`delete from reviews where id = ${Math.trunc(ctx.reviewId)} and user_id = (select id from customer_users where email = '${sql(EMAIL)}')`)
      } catch (e) {
        console.warn(`[review-photo-moderation] Review-Aufräumen: ${(e as Error).message.slice(0, 200)}`)
      }
      // Fotodateien der eigenen Review (nur das Verzeichnis dieser Review-ID, falls das Backend im Standardpfad schreibt)
      const dir = path.join(process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend', 'review_photos', String(ctx.reviewId))
      if (ctx.reviewId && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    }
    await shop?.destroy()

    const endedAt = new Date().toISOString()
    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const overall = steps.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(path.join(reportsDir, `review-photo-moderation-${endedAt.slice(0, 10)}.md`), [
      `## Journey: Review-Foto-Moderation — ${ctx.skip ? 'SKIP' : overall}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      ctx.skip ? `Skip-Grund: ${ctx.skip}` : '',
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...steps.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Aufräumen',
      `Review, Fotos und Audit-Zeilen per SQL (nur Review-ID ${ctx.reviewId}), Spec-Shop per Admin-Delete; Kunde ${EMAIL} räumt der Teardown (Marker e2e-${RUN_ID}-).`,
    ].join('\n'), 'utf8')
  })

  test('S1 — Upload: Foto ist pending, Gateway-Auftrag ist am Foto vermerkt (AK 1)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    ctx.webhook = await upload(1)
    const db = dbPhoto(ctx.webhook.id)
    expect(db.status).toBe('pending')
    expect(db.hasTask && db.hasRequestedAt, 'Task-ID und Anfragezeit gesetzt').toBe(true)
    const st = (await photoStatuses(ctx.token, ctx.reviewId)).find(p => p.photo_id === ctx.webhook!.id)
    expect(st?.status, 'Statusendpoint der Kundin').toBe('pending')
    note('S1', 'Upload', 'pending + Task-ID', `status=${db.status}, task=${db.hasTask}`)
  })

  test('S2 — Gateway-Ergebnis "abgelehnt" kommt per Webhook zurück: Foto rejected, Audit "system" (AK 3/4)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    const task = await leaseTaskById(ctx.webhook!.taskId)
    expect(task, 'eigener Task in der Gateway-Queue').not.toBeNull()
    const code = await submitResult(
      task!.task_id,
      moderationResult({ approved: false, confidence: 0.91, reason: 'E2E canned: spam overlay', categories: ['spam'] }),
      'e2e-canned-model',
    )
    expect(code, 'Gateway nimmt das Ergebnis an').toBeLessThan(300)
    expect(await pollStatus(ctx.webhook!.id, 'rejected'), 'Kundin sieht rejected').toBe('rejected')

    const st = (await photoStatuses(ctx.token, ctx.reviewId)).find(p => p.photo_id === ctx.webhook!.id)!
    expect(st.moderation_categories).toEqual(['spam'])
    expect(st.moderation_reason).toContain('spam overlay')
    const db = dbPhoto(ctx.webhook!.id)
    expect(db.model, 'tatsächliches Modell aus dem Webhook').toBe('e2e-canned-model')
    expect(db.adminId, 'keine Admin-Entscheidung').toBe('')
    expect(auditRows(ctx.webhook!.id)).toEqual(['photo_rejected/system'])
    note('S2', 'Webhook-Ergebnis', 'rejected, spam, Audit photo_rejected/system', `${st.status}, ${db.model}`)
  })

  test('S3 — Ungültiges Ergebnis entscheidet nichts: Foto bleibt pending (Fehlerfall)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    ctx.a = await upload(2)
    const task = await leaseTaskById(ctx.a.taskId)
    expect(task).not.toBeNull()
    // confidence 1.5 verletzt den Vertrag (0..1): das Backend darf nichts entscheiden. Mock-Hülle wie der Worker.
    const code = await submitResult(task!.task_id, moderationResult({ approved: true, confidence: 1.5, reason: null, categories: [] }))
    expect(code).toBeLessThan(300)
    expect(await waitWebhookDelivered(ctx.a.taskId), 'Webhook wurde zugestellt').toBe('delivered')
    const db = dbPhoto(ctx.a.id)
    expect(db.status, 'bleibt pending').toBe('pending')
    expect(db.model).toBe('')
    expect(auditRows(ctx.a.id)).toEqual([])
    note('S3', 'Ungültiges Ergebnis', 'pending, keine Audit-Zeile', `status=${db.status}`)
  })

  test('S4 — Überfällige Fotos stehen in der Admin-API, frische und entschiedene nicht (AK 9)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    // ctx.a bleibt pending und wird gealtert; ctx.b ist das zweite überfällige, ctx.fresh bleibt frisch
    ctx.b = await upload(3)
    ctx.fresh = await upload(4)
    ageReviewPhoto(ctx.a!.id, ctx.reviewId, 40)
    ageReviewPhoto(ctx.b.id, ctx.reviewId, 40)

    const noAuth = await fetch(`${BACKEND_URL}/api/v1/admin/reviews/photos/unmoderated`)
    expect(noAuth.status, 'ohne Admin-Anmeldung').toBe(401)
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/reviews/photos/unmoderated?limit=200`, { headers: adminHeaders() })
    expect(res.status).toBe(200)
    const list = (await res.json()) as Array<{ photo_id: number; waiting_minutes: number; moderation_task_id: string | null }>
    const ids = list.map(p => p.photo_id)
    expect(ids).toContain(ctx.a!.id)
    expect(ids).toContain(ctx.b.id)
    expect(ids, 'frisches Foto nicht überfällig').not.toContain(ctx.fresh.id)
    expect(ids, 'per Webhook entschiedenes Foto nicht in der Liste').not.toContain(ctx.webhook!.id)
    const mine = list.find(p => p.photo_id === ctx.a!.id)!
    expect(mine.waiting_minutes).toBeGreaterThanOrEqual(39)
    expect(mine.moderation_task_id).toBe(ctx.a!.taskId)
    note('S4', 'Admin-API-Liste', 'a+b enthalten; frisch/entschieden nicht', `${list.length} Einträge, a=${mine.waiting_minutes} min`)
  })

  test('S5 — Admin sieht im Tab "Fotos ohne Prüfergebnis" die überfälligen Fotos und gibt eines frei (AK 9)', async ({ adminPage: page }) => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/reviews?filter=unmoderated_photos`)
    await expect(page.getByRole('link', { name: 'Photos without result' }), 'Tab vorhanden').toBeVisible()
    const rowA = page.locator('article', { has: page.locator(`img[alt="Review photo ${ctx.a!.id} awaiting moderation"]`) })
    const rowB = page.locator('article', { has: page.locator(`img[alt="Review photo ${ctx.b!.id} awaiting moderation"]`) })
    const rowFresh = page.locator(`img[alt="Review photo ${ctx.fresh!.id} awaiting moderation"]`)
    await expect(rowA).toBeVisible()
    await expect(rowB).toBeVisible()
    await expect(rowFresh, 'frisches Foto nicht gelistet').toHaveCount(0)
    await expect(rowA).toContainText(/Waiting (39|4\d) min/)
    await expect(rowA).toContainText('Not visible yet')

    await rowA.getByRole('button', { name: 'Approve photo' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(rowA, 'Zeile verschwindet nach der Freigabe').toHaveCount(0)
    await expect(rowB, 'das andere Foto bleibt').toBeVisible()

    const db = dbPhoto(ctx.a!.id)
    expect(db.status).toBe('approved')
    expect(db.adminId, 'Admin vermerkt').not.toBe('')
    expect(auditRows(ctx.a!.id)).toEqual(['photo_approved/admin'])
    expect(await pollStatus(ctx.a!.id, 'approved', 5_000), 'Kundin sieht approved').toBe('approved')
    note('S5', 'Admin-UI Freigabe', 'Zeile weg, approved, Audit admin', `status=${db.status}`)
  })

  test('S6 — Admin lehnt das zweite Foto mit Kategorie Spam ab; Kundin sieht rejected + Grund (AK 9)', async ({ adminPage: page }) => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    await page.goto(`${BASE_URL}/admin/reviews?filter=unmoderated_photos`)
    const rowB = page.locator('article', { has: page.locator(`img[alt="Review photo ${ctx.b!.id} awaiting moderation"]`) })
    await expect(rowB).toBeVisible()
    await rowB.getByLabel('Reason (optional)').fill('E2E admin reject')
    await rowB.getByLabel('Spam').check()
    await rowB.getByRole('button', { name: 'Reject photo' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(rowB).toHaveCount(0)

    const st = (await photoStatuses(ctx.token, ctx.reviewId)).find(p => p.photo_id === ctx.b!.id)!
    expect(st.status).toBe('rejected')
    expect(st.moderation_categories).toEqual(['spam'])
    expect(st.moderation_reason).toBe('E2E admin reject')
    expect(auditRows(ctx.b!.id)).toEqual(['photo_rejected/admin'])
    note('S6', 'Admin-UI Ablehnung', 'rejected, spam, Audit admin', `${st.status}, ${JSON.stringify(st.moderation_categories)}`)
  })

  test('S7 — Zweite Entscheidung → 409; spätes Gateway-Ergebnis ändert die Admin-Entscheidung nicht (AK 8)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    const again = await fetch(`${BACKEND_URL}/api/v1/admin/reviews/photos/${ctx.b!.id}/approve`, { method: 'POST', headers: adminHeaders(), body: '{}' })
    expect(again.status).toBe(409)
    expect(((await again.json()) as { detail?: string }).detail).toBe('photo_already_moderated')

    // Der Worker liefert "approved" zum Foto, das der Admin abgelehnt hat: Entscheidung bleibt
    const task = await leaseTaskById(ctx.b!.taskId)
    expect(task, 'Auftrag des abgelehnten Fotos wartet noch in der Queue').not.toBeNull()
    expect(await submitResult(task!.task_id, moderationResult({ approved: true, confidence: 0.99, reason: null, categories: [] }))).toBeLessThan(300)
    expect(await waitWebhookDelivered(ctx.b!.taskId)).toBe('delivered')
    expect(dbPhoto(ctx.b!.id).status, 'bleibt vom Admin abgelehnt').toBe('rejected')
    expect(auditRows(ctx.b!.id)).toEqual(['photo_rejected/admin'])

    // Foto a (freigegeben): sein Auftrag war schon in S3 beantwortet, hier gibt es kein spätes Ergebnis mehr.
    expect(dbPhoto(ctx.a!.id).status).toBe('approved')
    expect(auditRows(ctx.a!.id)).toEqual(['photo_approved/admin'])
    note('S7', '409 + spätes Ergebnis', '409; Status unverändert', 'rejected / approved bleiben')
  })

  test('S8 — Leerzustand: Nach den Entscheidungen listet der Tab keines der eigenen Fotos mehr', async ({ adminPage: page }) => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    await page.goto(`${BASE_URL}/admin/reviews?filter=unmoderated_photos`)
    await expect(page.getByRole('link', { name: 'Photos without result' })).toBeVisible()
    for (const p of [ctx.webhook, ctx.a, ctx.b]) {
      await expect(page.locator(`img[alt="Review photo ${p!.id} awaiting moderation"]`)).toHaveCount(0)
    }
    note('S8', 'Tab nach Entscheidungen', 'eigene Fotos nicht mehr gelistet', 'nicht gelistet')
  })
})
