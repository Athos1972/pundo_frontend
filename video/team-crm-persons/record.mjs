// Recorder for team video 5b "CRM: people and roles" (F8960).  Usage: node record.mjs en
// Same rules as ../team-crm/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run, privacy check per
// scene, admin login via API), demo data from ../team-common/prepare_team.py (marker "Team Demo"). Person and contact lists hold real people of
// the prod copy: every table row without "Team Demo" is blurred by a persistent MutationObserver (armMask) the moment it is rendered.
// What is DONE (test DB only): person "Team Demo Anna" created through the form; role "owner" at "Team Demo Bakery" added to the seeded person
// "Team Demo Petros" and ended; the demo contact linked to Petros. prepare_team.py puts everything back / deletes Anna.
// What is NEVER done: suppress (button only hovered), sending, confirm-business, safety settings. A fetch wrapper in the page rejects every
// write to outreach/send, suppress, confirm-business and crm/config; the run aborts if one was attempted, and the list of CRM write requests
// at the end must be exactly the expected one.
// Needs .cache/en/timeline.json (tts.py).  Env: SKIP_PREPARE=1 (prepare_team.py --dry-run), BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, click, moveTo, typeText, adminLogin } from '../_branding/lib/record-lib.mjs'
import { assertTestInstance, assertBackendHealthy } from '../_branding/lib/guard.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const MARK = 'Team Demo'

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else); resets the demo contact, removes the created one ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 200))
  demo = JSON.parse(out.at(-1))
}
const CID = demo.crm.contact_id
const PID = demo.person.person_id
const ORG = demo.person.org_id
const LIST = '/admin/crm/contacts'
const PEOPLE = '/admin/crm/persons'
const NEWP = '/admin/crm/persons/new'
const PERSON = `/admin/crm/persons/${PID}`
const DETAIL = `/admin/crm/contacts/${CID}`
// the address bar of the id scenes shows these ids (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [PERSON, DETAIL]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

const account = JSON.parse(fs.readFileSync(path.join(here, '../team-common/.recording-accounts.json'), 'utf8')).admin
if (!account) throw new Error('no admin account in ../team-common/.recording-accounts.json (run prepare_team.py)')

const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const dur = (id) => T.lead_in_s + A(id) + T.tail_s
const lead = T.lead_in_s
/** Scene time (s) at which the narration says `phrase` (first word of the phrase; words from tts.py's cache). */
const words = (id) => JSON.parse(fs.readFileSync(path.join(cacheDir, 'audio', `${id}.json`), 'utf8')).words
const when = (id, phrase) => {
  const w = words(id), p = phrase.split(' ')
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => w[i + k][2].replace(/[.,:;"]/g, '').toLowerCase() === x.toLowerCase())) return lead + w[i][0]
  throw new Error(`phrase "${phrase}" not found in narration of ${id}`)
}

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm() would be dismissed = "no"

// ---- safety net: nothing that goes outside or cannot be undone leaves the browser ----
await page.addInitScript(() => {
  const BLOCK = /\/api\/admin\/crm\/(contacts\/\d+\/(outreach\/send|suppress|confirm-business)|config)$/
  const orig = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input.url
    const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
    if (method !== 'GET' && BLOCK.test(new URL(url, location.href).pathname)) {
      try { const k = '__vidBlocked'; sessionStorage.setItem(k, JSON.stringify([...(JSON.parse(sessionStorage.getItem(k) || '[]')), method + ' ' + url])) } catch (e) {}
      return Promise.reject(new TypeError('blocked by the video recorder'))
    }
    return orig.apply(this, arguments)
  }
})
const writes = []                                        // every non-GET request to the CRM API (proof of what the video did)
page.on('request', (r) => { if (r.method() !== 'GET' && /\/api\/admin\/crm\//.test(r.url())) writes.push(`${r.method()} ${new URL(r.url()).pathname}`) })
const assertNothingBlocked = async () => {
  const b = await page.evaluate(() => sessionStorage.getItem('__vidBlocked'))
  if (b) throw new Error(`a forbidden write request was attempted: ${b}`)
}

const tid = (id) => page.locator(`[data-testid=${id}]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
/** Persistent guard: a MutationObserver blurs every table row without the demo marker the moment React (re)renders it (lost on a full page load: call again). */
const armMask = () => page.evaluate((keep) => {
  if (window.__vidMaskObs) return
  const run = () => document.querySelectorAll('tbody tr').forEach((el) => {
    if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
  })
  window.__vidMaskObs = new MutationObserver(run)
  window.__vidMaskObs.observe(document.body, { childList: true, subtree: true, characterData: true })
  run()
}, MARK)
/** Scroll the scrolling ancestor of <main> smoothly to y. */
const scrollTo = (y, ms = 700) => page.evaluate(([y, ms]) => new Promise((res) => {
  let el = document.querySelector('main')
  while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement
  const sc = el || document.scrollingElement
  const from = sc.scrollTop, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (y - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [y, ms])
/** Scroll so that the element sits `margin` px below the top edge of the scroller. */
const scrollToEl = async (loc, margin = 90, ms = 700) => {
  const y = await loc.evaluate((el, margin) => {
    let sc = document.querySelector('main')
    while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
    sc = sc || document.scrollingElement
    return Math.max(0, el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - margin)
  }, margin)
  await scrollTo(y, ms)
}
let frozen = false
const freeze = async () => { await sess.pause(); frozen = true }
const thaw = async () => { if (frozen) { await sess.resume(); frozen = false; await sleep(400) } }

/** Hidden navigation before a scene (frames before the scene start are not used). */
async function visit(p, ready, mask = (p === LIST || p === PEOPLE)) {   // blur only on LIST pages (a person/contact page holds only demo data)
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (mask) await armMask()
  if (ready) await ready()
  await sleep(300)
  await thaw()
}
/** List rule: at least one demo row; everything else is blurred (the observer does it, the counts are logged). */
const requireDemoRows = async (what) => {
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  ${what}: ${n} demo row(s) of ${all}`)
  if (n === 0) throw new Error(`${what}: no demo row found - run prepare_team.py`)
  const masked = await page.locator('tbody tr[data-vid-masked]').count()
  if (masked !== all - n) throw new Error(`${what}: ${all - n} real rows but only ${masked} blurred`)
}
const stateBadge = () => page.locator('h1').first().locator('xpath=following-sibling::div').locator('span').last()
const readState = async () => (await stateBadge().innerText()).trim()

/** Click a link; the page switch happens while the picture is frozen, `ready` runs before the picture resumes. */
async function goClick(loc, urlTest, ready) {
  await armMask()                        // client-side navigation keeps the observer alive
  await click(page, loc)
  await sleep(220)                       // ripple is visible in the last frozen frame
  await sess.pause()
  await page.waitForURL(urlTest, { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await armMask()
  if (ready) await ready()
  await sleep(300)
  await sess.resume()
}
const chip = (state) => page.locator(`a[href="/admin/crm/contacts?lifecycle_state=${state}"]`).first()

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of [LIST, PEOPLE, `${PEOPLE}?q=Team+Demo+Petros`, NEWP, PERSON, DETAIL]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}
writes.length = 0

// 1 open -------------------------------------------------------------------------------------------------------
await runScene(sess, 'open', dur('open'), () => visit(LIST, () => requireDemoRows('contact list')), async (at) => {
  await at(when('open', 'A contact'))
  const table = page.locator('table').first()
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('open', 'A person'))
  await highlight(table, false)
  await at(when('open', 'You reach'))
  const link = page.getByRole('link', { name: 'People', exact: true }).first()
  await moveTo(page, link, 900)
  await highlight(link)
  await at(dur('open') - 0.8)
  await highlight(link, false)
})

// 2 list -------------------------------------------------------------------------------------------------------
await runScene(sess, 'list', dur('list'), () => visit(PEOPLE, () => requireDemoRows('people list')), async (at) => {
  await at(when('list', 'This is'))
  const table = page.locator('table').first()
  await moveTo(page, table, 900)
  await at(when('list', 'It shows'))
  const head = page.locator('thead').first()
  await moveTo(page, head, 800)
  await highlight(head)
  await at(when('list', 'Always search'))
  await highlight(head, false)
  const input = page.locator('input[name="q"]').first()
  await click(page, input)
  await page.keyboard.type('Team Demo Petros', { delay: 70 })
  await at(when('list', 'and press'))
  await sleep(250)
  await sess.pause()                                       // GET form = full page load, hidden by the freeze
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.get('q') === 'Team Demo Petros', { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  await armMask()
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  search: ${n} demo row(s) of ${all}`)
  if (n !== 1 || all !== 1) throw new Error('search "Team Demo Petros" must find exactly the demo person')
  await sess.resume()
  await at(when('list', 'When you'))
  const name = page.locator('tbody tr', { hasText: MARK }).locator('a').first()
  await moveTo(page, name, 800)
  await highlight(name)
  await at(dur('list') - 0.8)
  await highlight(name, false)
})

// 3 create -----------------------------------------------------------------------------------------------------
let createdId = null
await runScene(sess, 'create', dur('create'), () => visit(NEWP), async (at) => {
  await at(when('create', 'To add'))
  await sleep(200)
  await at(when('create', 'Type the'))
  await click(page, page.getByLabel('Display name'))
  await typeText(page, 'Team Demo Anna', 55)
  await at(when('create', 'Then give'))
  await click(page, page.getByLabel('Email address'))
  await typeText(page, 'anna@pundo-e2e.io', 45)
  await at(when('create', 'The address'))
  const addr = page.getByLabel('Address', { exact: true })
  await moveTo(page, addr, 700)
  await highlight(addr)
  await at(when('create', 'Click Add'))
  await highlight(addr, false)
  const submit = page.getByRole('button', { name: 'Add person', exact: true })
  const { x, y } = await moveTo(page, submit, 700)
  await highlight(submit)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(250)
  await freeze()                                            // freeze BEFORE the click: the page then moves on to the new person (other address bar)
  await page.mouse.click(x, y)                              // POST /crm/persons
  await page.waitForURL((u) => /^\/admin\/crm\/persons\/\d+$/.test(u.pathname) && !u.pathname.endsWith(`/${PID}`), { timeout: 30000 })
  createdId = Number(new URL(page.url()).pathname.split('/').pop())
  await page.locator('h1', { hasText: 'Team Demo Anna' }).waitFor({ timeout: 30000 })
  console.log(`  created person #${createdId}`)
})

// 4 roles ------------------------------------------------------------------------------------------------------
await runScene(sess, 'roles', dur('roles'), () => visit(PERSON, async () => {
  if (!(await page.locator('h1', { hasText: 'Team Demo Petros' }).count())) throw new Error('demo person page has the wrong name')
  if ((await page.getByRole('button', { name: 'End role', exact: true }).count()) !== 0) throw new Error('demo person still has an open role - run prepare_team.py (no SKIP_PREPARE)')
}), async (at) => {
  const ident = page.locator('section', { has: page.locator('h2', { hasText: 'Identifiers' }) }).first()
  await at(when('roles', 'Open a'))
  await moveTo(page, ident, 900)
  await highlight(ident)
  await at(when('roles', 'A role'))
  await highlight(ident, false)
  const box = page.locator('section', { has: page.locator('h2', { hasText: 'Roles' }) }).first()
  await moveTo(page, box, 800)
  await highlight(box)
  await at(when('roles', 'Type the'))
  await highlight(box, false)
  await click(page, page.locator('#person-org'))
  await typeText(page, String(ORG), 70)
  await at(when('roles', 'then choose'))
  const sel = page.locator('#person-role')
  await moveTo(page, sel, 600)
  await highlight(sel)
  await sel.selectOption('owner')                           // set without opening the native list
  await at(when('roles', 'and click'))
  await highlight(sel, false)
  await click(page, box.getByRole('button', { name: 'Add role', exact: true }), 500)
  await box.locator('li', { hasText: 'owner' }).first().waitFor({ timeout: 30000 })
  await at(when('roles', 'A person can'))
  await moveTo(page, box.locator('ul').first(), 800)
  await at(when('roles', 'When someone'))
  await click(page, box.getByRole('button', { name: 'End role', exact: true }).first(), 600)
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some((b) => b.textContent.trim() === 'End role'), null, { timeout: 30000 })
  await at(when('roles', 'Today'))
  await moveTo(page, box.locator('ul').first(), 700)
  await highlight(box.locator('ul').first())
  await at(dur('roles') - 0.8)
  await highlight(box.locator('ul').first(), false)
})

// 5 link (the Suppress button is only hovered) ----------------------------------------------------------------
await runScene(sess, 'link', dur('link'), () => visit(DETAIL, async () => {
  if ((await page.locator('#crm-person-id').count()) !== 1) throw new Error('demo contact is already linked to a person - run prepare_team.py (no SKIP_PREPARE)')
}), async (at) => {
  const field = page.locator('#crm-person-id')
  const form = field.locator('xpath=ancestor::form[1]')
  await at(when('link', 'Under the'))
  await moveTo(page, form, 900)
  await highlight(form)
  await at(when('link', 'Type the'))
  await click(page, field)
  await typeText(page, String(PID), 80)
  await at(when('link', 'and click'))
  await click(page, form.getByRole('button', { name: 'Link person', exact: true }), 500)
  const linked = page.getByRole('link', { name: /Linked person/ }).first()
  await linked.waitFor({ timeout: 30000 })
  await at(when('link', 'The contact'))
  await moveTo(page, linked, 800)
  await highlight(linked)
  await at(when('link', 'Be careful'))
  await highlight(linked, false)
  await at(when('link', 'If you'))
  const btn = page.getByRole('button', { name: 'Suppress / Opt-out', exact: true }).first()
  await moveTo(page, btn, 900)                              // hover only: NEVER clicked (suppression cannot be undone)
  await highlight(btn)
  await at(when('link', 'That is'))
  await highlight(btn, false)
  await at(when('link', 'More help'))
  const help = page.locator('aside nav a[href="/admin/help"]').first()
  await moveTo(page, help, 900)
  await highlight(help)
  await at(dur('link') - 0.8)
  await highlight(help, false)
})

await unhighlightAll()
await assertNothingBlocked()
const norm = (w) => w.replace(/\/roles\/\d+\/end$/, '/roles/<id>/end')
const expected = ['POST /api/admin/crm/persons', `POST /api/admin/crm/persons/${PID}/roles`, `POST /api/admin/crm/persons/${PID}/roles/<id>/end`, `POST /api/admin/crm/persons/${PID}/contacts/${CID}`]
console.log('  CRM write requests:', writes)
if (JSON.stringify(writes.map(norm).sort()) !== JSON.stringify([...expected].sort())) throw new Error(`unexpected CRM write requests: ${JSON.stringify(writes)}`)
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
