/**
 * Journey: LLM-Wirkung Homesick + Spotted (B8950-016 T14)
 * Runbook: e2e/journeys/llm-effects-homesick-spotted.md
 *
 * Wirkung statt Durchlauf: Kunde loest die Anfrage ueber die echte API aus, der Auftrag landet im Gateway-Testserver
 * (8600), ein Golden-Canned-Worker (`_helpers/gateway-worker.ts`, Antwort = Golden-Fixture des Workers) beantwortet
 * genau diesen einen Task, das Gateway liefert den signierten Webhook an das Backend. Geprueft wird, was dort ankommt:
 * Datenbankzeilen, Angebot, Mail im Mail-Sink. Bei 0 Wirkung wird der Test rot (nicht nur "Task lief").
 *
 * Fixtures: Kunde `e2e-<run>-llm-effects-*@pundo.com` (auto-verifiziert), Spotted-Produkt `E2E-<run>-LLM-EFFECTS ...`.
 * Cleanup: Spotted-Zeile, Angebot, Listing und Item des Markers per psql (nur pundo_test); Kunde raeumt der Teardown.
 */
import { test, expect } from '../fixtures'
import { randomBytes } from 'crypto'
import { apiFetch } from './_helpers'
import { waitForMail } from './_helpers/mail-sink'
import { cannedFromGolden, failTask, gatewaySkipReason, leaseOwnTask, submitResult } from './_helpers/gateway-worker'
import { e2eEmail, marker, psql } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests duerfen nicht gegen Produktiv-Ports laufen!')
}

const EMAIL = e2eEmail('llm-effects', 'pundo.com')
const PASSWORD = `E2e-${randomBytes(6).toString('hex')}-Aa1!`
const MARK = marker('LLM-EFFECTS')
const ctx = { token: '', skip: null as string | null }
const auth = () => ({ Authorization: `Bearer ${ctx.token}` })
const sql = (s: string) => s.replace(/'/g, "''")

test.describe.serial('LLM-Wirkung: Homesick und Spotted', () => {
  test.beforeAll(async () => {
    ctx.skip = (await gatewaySkipReason('homesick.similar')) ?? (await gatewaySkipReason('spotted.classify'))
    if (ctx.skip) return
    const signup = await apiFetch('POST', '/api/v1/customer/auth/signup', { email: EMAIL, password: PASSWORD, display_name: 'E2E LLM Effects' })
    expect(signup.status, `signup: ${JSON.stringify(signup.data)}`).toBe(201)
    const login = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    expect(login.status).toBe(200)
    ctx.token = (login.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
    expect(ctx.token, 'customer_token').not.toBe('')
  })

  test.afterAll(() => {
    // FK-Reihenfolge: Spotted verweist auf Angebot/Listing/Item
    const uid = psql(`select id from customer_users where email = '${sql(EMAIL)}'`)
    if (uid) psql(`delete from spotted_submissions where user_id = ${uid}`)
    const items = psql(`select id from items where names->>'en' like '${sql(MARK)}%'`).split('\n').filter(Boolean)
    for (const id of items) {
      psql(`delete from offers where shop_listing_id in (select id from shop_listings where item_id = ${id})`)
      psql(`delete from shop_listings where item_id = ${id}`)
      psql(`delete from items where id = ${id}`)
    }
  })

  test('A8: Homesick-Antwort des Workers landet als Suchergebnis in der DB und als Mail im Postfach', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    const query = `${MARK} plum jam from home`
    const submit = await apiFetch('POST', '/api/v1/customer/similarity-search/submit', { query }, auth())
    expect(submit.status, `submit: ${JSON.stringify(submit.data)}`).toBe(202)
    const searchId = (submit.data as { id?: number; search_id?: number }).id ?? (submit.data as { search_id?: number }).search_id
    expect(searchId, 'Antwort enthaelt die Such-ID').toBeDefined()

    const task = await leaseOwnTask('homesick.similar', MARK)
    expect(task, 'der Auftrag des Backends liegt im Gateway').not.toBeNull()
    const reply = `${MARK} reply: try plum jam from a local delicatessen.`
    expect(await submitResult(task!.task_id, cannedFromGolden('homesick.similar', { reply_text: reply }))).toBeLessThan(300)

    await expect.poll(() => psql(`select status from customer_similarity_searches where id = ${searchId}`), {
      message: 'Suche muss nach dem Worker-Ergebnis auf done stehen (Webhook -> Handler -> DB)', timeout: 30_000,
    }).toBe('done')
    expect(psql(`select llm_response from customer_similarity_searches where id = ${searchId}`)).toContain(MARK)
    expect(psql(`select email_sent_at is not null from customer_similarity_searches where id = ${searchId}`)).toBe('t')

    const mail = await waitForMail(EMAIL, 20_000)
    expect(`${mail.text ?? ''}${mail.html ?? ''}`, 'die Antwort des Workers steht in der Mail').toContain('local delicatessen')
  })

  test('A9: Spotted-Foto wird vom Worker erkannt und wird zum Angebot (Item, Listing, Offer, Mail)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    // ein aktiver Shop mit Standort: der Handler verlangt einen Shop im Umkreis von 500 m
    const shop = psql(`select id || '|' || ST_Y(location::geometry) || '|' || ST_X(location::geometry) from shops where status = 'active' and location is not null order by id limit 1`)
    test.skip(shop === '', 'kein aktiver Shop mit Standort in pundo_test')
    const [shopId, lat, lng0] = shop.split('|')
    const lng = (Number(lng0) + Math.floor(Math.random() * 90) / 1e6).toFixed(6) // eindeutig fuer payload_contains, ~7 m

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHhMDVQAAAABJRU5ErkJggg==', 'base64')
    const form = new FormData()
    form.append('file', new Blob([png], { type: 'image/png' }), 'spotted.png')
    form.append('latitude', lat)
    form.append('longitude', lng)
    form.append('language', 'en')
    const upload = await fetch(`${BACKEND_URL}/api/v1/customer/spotted`, { method: 'POST', headers: auth(), body: form })
    expect(upload.status, `upload: ${await upload.clone().text()}`).toBe(202)
    const spottedId = ((await upload.json()) as { spotted_id: number }).spotted_id

    const task = await leaseOwnTask('spotted.classify', `"lng": ${Number(lng)}`)
    expect(task, 'der Auftrag des Backends liegt im Gateway').not.toBeNull()
    const product = `${MARK} Halloumi 250g`
    expect(await submitResult(task!.task_id, cannedFromGolden('spotted.classify', { product_name: product }))).toBeLessThan(300)

    await expect.poll(() => psql(`select status from spotted_submissions where id = ${spottedId}`), {
      message: 'Spotted-Foto muss nach dem Worker-Ergebnis erfolgreich sein (nicht rejected/pending)', timeout: 30_000,
    }).toBe('successful')
    expect(psql(`select shop_id from spotted_submissions where id = ${spottedId}`), 'Shop aus dem Umkreis').toBe(shopId)
    expect(psql(`select count(*) from offers where id = (select offer_id from spotted_submissions where id = ${spottedId}) and source = 'spotted' and not archived`), 'Angebot angelegt').toBe('1')
    expect(psql(`select names->>'en' from items where id = (select item_id from spotted_submissions where id = ${spottedId})`)).toBe(product)
    expect((await waitForMail(EMAIL, 20_000)).subject, 'Bestaetigungs- oder Erfolgsmail liegt im Sink').toBeTruthy()
  })

  test('A9 Fehlerpfad: ein fehlgeschlagener Vision-Task wird nicht still ignoriert (rejected + Grund)', async () => {
    test.skip(!!ctx.skip, ctx.skip ?? '')
    test.setTimeout(90_000)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHhMDVQAAAABJRU5ErkJggg==', 'base64')
    const lng = (33.1 + Math.floor(Math.random() * 99000) / 1e6).toFixed(6)
    const form = new FormData()
    form.append('file', new Blob([png], { type: 'image/png' }), 'spotted-fail.png')
    form.append('latitude', '34.9')
    form.append('longitude', lng)
    form.append('language', 'en')
    const upload = await fetch(`${BACKEND_URL}/api/v1/customer/spotted`, { method: 'POST', headers: auth(), body: form })
    expect(upload.status).toBe(202)
    const spottedId = ((await upload.json()) as { spotted_id: number }).spotted_id
    const task = await leaseOwnTask('spotted.classify', `"lng": ${Number(lng)}`)
    expect(task).not.toBeNull()
    expect(await failTask(task!.task_id, 'e2e: canned vision failure')).toBeLessThan(300)
    await expect.poll(() => psql(`select status || '|' || coalesce(error_reason, '') from spotted_submissions where id = ${spottedId}`), { timeout: 30_000 })
      .toBe('rejected|vision_failed')
  })
})
