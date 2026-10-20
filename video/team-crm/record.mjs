// Recorder for team video 5 "CRM: contacts and safety" (F8960 T22).  Usage: node record.mjs en
// Same rules as ../team-claims-owners/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo"). The CRM list holds thousands of real contacts of the prod copy: every table
// row without "Team Demo" is blurred by a persistent MutationObserver (armMask) the moment it is rendered.
// What is DONE here (test DB only): the contact "Team Demo Maria" (organisation "Team Demo Cafe") is created through the admin form,
// "Team Demo Contact" gets a phone channel and is moved NEEDS_REVIEW -> SOURCED with "Set state". prepare_team.py puts everything back.
// What is NEVER done: sending (the outreach "Send email" button is only hovered), suppressing (the dialog is cancelled), changing the
// safety settings, "Confirm business" (moves the contact to QUEUED). Safety net: a fetch wrapper in the page rejects every write request to
// outreach/send, suppress, confirm-business and crm/config before it leaves the browser, and the run aborts if one was attempted;
// at the end the list of write requests must be exactly the expected one.
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
const LIST = '/admin/crm/contacts'
const NEW = '/admin/crm/contacts/new'
const DETAIL = `/admin/crm/contacts/${CID}`
const SETTINGS = '/admin/crm/settings'
// the address bar of the detail scenes shows this id (window_path in scenes.yml): fail early when it differs
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
if (!scenesYml.includes(`localhost:3500${DETAIL}"`)) throw new Error(`scenes.yml window_path does not contain ${DETAIL} - update it`)

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
async function visit(p, ready, mask = p.startsWith(LIST) && p !== NEW && !/\/\d+$/.test(p)) {   // blur only on LIST pages (a contact page holds only the demo contact's own rows)
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
for (const p of [LIST, `${LIST}?lifecycle_state=NEEDS_REVIEW`, `${LIST}?q=Team+Demo+Bakery`, NEW, DETAIL, SETTINGS]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}
writes.length = 0

// 1 list -------------------------------------------------------------------------------------------------------
await runScene(sess, 'list', dur('list'), () => visit(LIST, () => requireDemoRows('list')), async (at) => {
  const chips = chip('SOURCED').locator('xpath=..')
  await at(when('list', 'The CRM'))
  await moveTo(page, page.locator('table').first(), 900)
  await at(when('list', 'The chips'))
  await moveTo(page, chips, 800)
  await highlight(chips)
  let prev = chips
  for (const [phrase, state] of [['Sourced means', 'SOURCED'], ['Needs review waits', 'NEEDS_REVIEW'], ['Queued is', 'QUEUED'], ['Contacted means', 'CONTACTED'], ['Hard opt-out means', 'HARD_OPTOUT']]) {
    await at(when('list', phrase))
    await highlight(prev, false)                           // hover only: the chips are not clicked here
    await moveTo(page, chip(state), 450)
    await highlight(chip(state))
    prev = chip(state)
  }
  await at(when('list', 'Click'))
  await unhighlightAll()
  await goClick(chip('NEEDS_REVIEW'), (u) => u.searchParams.get('lifecycle_state') === 'NEEDS_REVIEW', () => requireDemoRows('list (Needs review)'))
  await at(when('list', 'Rows'))
  const table = page.locator('table').first()
  await moveTo(page, table, 800)
  await highlight(table)
  await at(dur('list') - 0.8)
  await highlight(table, false)
})

// 2 search -----------------------------------------------------------------------------------------------------
await runScene(sess, 'search', dur('search'), () => visit(LIST, () => requireDemoRows('list')), async (at) => {
  const input = page.locator('input[name="q"]').first()
  await at(when('search', 'Type part'))
  await click(page, input)
  await page.keyboard.type('Team Demo Bakery', { delay: 70 })
  await at(when('search', 'and press'))
  await sleep(250)
  await sess.pause()                                       // GET form = full page load, hidden by the freeze
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.get('q') === 'Team Demo Bakery', { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  await armMask()
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  search: ${n} demo row(s) of ${all}`)
  if (n !== 1 || all !== 1) throw new Error('search "Team Demo Bakery" must find exactly the demo contact')
  await sess.resume()
  await at(when('search', 'If the'))
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  await moveTo(page, row, 800)
  await highlight(row)
  await at(when('search', 'Only if'))
  await highlight(row, false)
  const add = page.getByRole('link', { name: 'Add contact' }).first()
  await moveTo(page, add, 800)
  await highlight(add)
  await at(dur('search') - 0.8)
  await highlight(add, false)
})

// 3 create -----------------------------------------------------------------------------------------------------
let createdId = null
await runScene(sess, 'create', dur('create'), () => visit(NEW), async (at) => {
  const f = (name) => page.locator(`[name="${name}"]`).first()
  await at(when('create', 'Fill in'))
  await click(page, f('org_name'))
  await typeText(page, 'Team Demo Cafe', 55)
  await at(when('create', 'Add the'))
  await click(page, f('display_name'))
  await typeText(page, 'Team Demo Maria', 55)
  await at(when('create', 'Then give'))
  await click(page, f('email'))
  await typeText(page, 'maria.demo@pundo-e2e.io', 45)
  await click(page, f('phone'), 450)
  await typeText(page, '+35790000001', 50)
  await at(when('create', 'Choose where'))
  const sel = page.locator('#source_select')
  await moveTo(page, sel, 700)
  await highlight(sel)
  await sel.selectOption('manual')                          // set without opening the native list
  await at(when('create', 'Click Create'))
  await highlight(sel, false)
  const submit = page.getByRole('button', { name: 'Create contact', exact: true })
  const { x, y } = await moveTo(page, submit, 700)
  await highlight(submit)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(250)
  await freeze()                                            // freeze BEFORE the click: the page then moves on to the new contact, which has no matching address bar
  await page.mouse.click(x, y)                              // POST /crm/contacts/ingest
  await page.waitForURL((u) => /^\/admin\/crm\/contacts\/\d+$/.test(u.pathname) && !u.pathname.endsWith(`/${CID}`), { timeout: 30000 })
  createdId = Number(new URL(page.url()).pathname.split('/').pop())
  await page.locator('h1', { hasText: 'Team Demo Maria' }).waitFor({ timeout: 30000 })
  const st = await readState()
  console.log(`  created contact #${createdId}, state "${st}"`)
  if (st !== 'Sourced') throw new Error(`new contact is "${st}", expected "Sourced"`)
})

// 4 channels ---------------------------------------------------------------------------------------------------
await runScene(sess, 'channels', dur('channels'), () => visit(DETAIL, async () => {
  const st = await readState()
  if (st !== 'Needs review') throw new Error(`demo contact is "${st}", expected "Needs review" - run prepare_team.py (no SKIP_PREPARE)`)
  if ((await page.locator('table tbody tr', { hasText: 'whatsapp' }).count()) !== 1) throw new Error('demo contact lost its whatsapp channel')
}), async (at) => {
  const head = page.locator('h1').first().locator('xpath=..')
  await at(when('channels', 'This is'))
  await moveTo(page, head, 800)
  await highlight(head)
  await at(when('channels', 'Channels are'))
  await highlight(head, false)
  const section = page.locator('section', { has: page.locator('h2', { hasText: 'Channels' }) }).first()
  await scrollToEl(section, 90, 800)
  await moveTo(page, section.locator('table').first(), 800)
  await highlight(section.locator('table').first())
  await at(when('channels', 'Each row'))
  await moveTo(page, section.locator('thead').first(), 700)
  await at(when('channels', 'Click Add'))
  await highlight(section.locator('table').first(), false)
  await click(page, page.getByRole('button', { name: '+ Add channel' }))
  const form = tid('channel-add-form')
  await form.waitFor()
  await form.locator('select').selectOption('phone')
  await click(page, form.locator('input[type=text]'), 500)
  await typeText(page, '+35790000002', 55)
  await at(when('channels', 'and type'))
  await click(page, form.getByRole('button', { name: 'Add channel', exact: true }), 500)
  await page.locator('table tbody tr', { hasText: '+35790000002' }).first().waitFor({ timeout: 30000 })
  await at(when('channels', 'The last'))
  await moveTo(page, section.locator('table').first(), 700)
  await at(when('channels', 'A WhatsApp'))
  const doc = page.locator('section', { has: page.locator('h2', { hasText: 'Document a contact' }) }).first()
  await scrollToEl(doc, 90, 800)
  await moveTo(page, doc, 800)
  await highlight(doc)
  await at(dur('channels') - 0.8)
  await highlight(doc, false)
})

// 5 review -----------------------------------------------------------------------------------------------------
await runScene(sess, 'review', dur('review'), () => visit(DETAIL, async () => {
  const st = await readState()
  if (st !== 'Needs review') throw new Error(`demo contact is "${st}", expected "Needs review"`)
}), async (at) => {
  const badge = stateBadge()
  await at(when('review', 'Now the'))
  await moveTo(page, badge, 800)
  await highlight(badge)
  await at(when('review', 'The system'))
  await highlight(badge, false)
  const bar = page.getByRole('button', { name: 'Set state', exact: true }).locator('xpath=..')
  await at(when('review', 'With a'))
  await moveTo(page, bar, 800)
  await highlight(bar)
  await at(when('review', 'Without one'))
  await highlight(bar, false)
  await click(page, page.getByRole('button', { name: 'Set state', exact: true }))
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  await at(when('review', 'choose Sourced'))
  const sel = dialog.locator('select')
  await moveTo(page, sel, 600)
  await sel.selectOption('SOURCED')                        // set without opening the native list
  await at(when('review', 'and save'))
  await click(page, dialog.getByRole('button', { name: 'Save', exact: true }), 500)
  await page.waitForFunction(() => /Sourced/.test(document.querySelector('h1')?.parentElement?.parentElement?.textContent || ''), null, { timeout: 30000 })
  await at(when('review', 'The badge'))
  await moveTo(page, badge, 700)
  await highlight(badge)
  await at(dur('review') - 0.8)
  await highlight(badge, false)
})

// 6 outreach ---------------------------------------------------------------------------------------------------
await runScene(sess, 'outreach', dur('outreach'), () => visit(DETAIL, async () => {
  const st = await readState()
  if (st !== 'Sourced') throw new Error(`demo contact is "${st}", expected "Sourced" (scene review failed?)`)
}), async (at) => {
  const box = page.locator('section', { has: page.locator('h2', { hasText: 'Outreach' }) }).first()
  await at(when('outreach', 'On the'))
  await scrollToEl(box, 90, 800)
  await moveTo(page, box, 800)
  await highlight(box)
  await at(when('outreach', 'Choose a'))
  await highlight(box, false)
  await click(page, box.getByRole('button', { name: 'English', exact: true }))
  await at(when('outreach', 'and click'))
  await click(page, box.getByRole('button', { name: 'Load preview', exact: true }))
  await box.getByText('Preview loaded').waitFor({ timeout: 30000 })
  await at(when('outreach', 'You get'))
  const body = box.locator('textarea')
  if (!(await body.inputValue()).trim()) throw new Error('preview body is empty')
  await moveTo(page, body, 800)
  await highlight(body)
  await at(when('outreach', 'Send email'))
  await highlight(body, false)
  const send = box.getByRole('button', { name: 'Send email', exact: true })
  await moveTo(page, send, 800)                            // hover only: NEVER clicked (a real e-mail would be sent)
  await highlight(send)
  await at(when('outreach', 'The timeline'))
  await highlight(send, false)
  const tlSec = page.locator('section', { has: page.locator('h2', { hasText: 'Interaction timeline' }) }).first()
  await scrollToEl(tlSec, 90, 800)
  await moveTo(page, tlSec, 800)
  await highlight(tlSec)
  await at(dur('outreach') - 0.8)
  await highlight(tlSec, false)
})

// 7 suppress (dialog opened and CANCELLED) --------------------------------------------------------------------
await runScene(sess, 'suppress', dur('suppress'), () => visit(DETAIL), async (at) => {
  const btn = page.getByRole('button', { name: 'Suppress / Opt-out', exact: true }).first()
  await at(when('suppress', 'If someone'))
  await moveTo(page, btn, 800)
  await highlight(btn)
  await at(when('suppress', 'click Suppress'))
  await highlight(btn, false)
  await click(page, btn)
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  const radios = dialog.locator('label')
  await at(when('suppress', 'Hard opt-out is'))
  await moveTo(page, radios.nth(0), 600)                   // hover only: the radio buttons are not changed
  await highlight(radios.nth(0))
  await at(when('suppress', 'Rejected (private) is'))
  await highlight(radios.nth(0), false)
  await moveTo(page, radios.nth(1), 600)
  await highlight(radios.nth(1))
  await at(when('suppress', 'After you'))
  await highlight(radios.nth(1), false)
  await moveTo(page, dialog, 700)
  await at(when('suppress', 'We cancel'))
  await click(page, dialog.getByRole('button', { name: 'Cancel', exact: true }))
  await dialog.waitFor({ state: 'detached', timeout: 10000 })
  const st = await readState()
  if (st !== 'Sourced') throw new Error(`state changed during the suppress scene: "${st}"`)
})

// 8 safety (only looked at) ------------------------------------------------------------------------------------
await runScene(sess, 'safety', dur('safety'), () => visit(SETTINGS, async () => {
  await page.getByText('Sending is active.').waitFor({ timeout: 15000 })   // the sentence "Here, sending is active" must be true
}), async (at) => {
  const sections = page.locator('main section')
  const kill = sections.nth(0), cap = sections.nth(1)
  await at(when('safety', 'The kill'))
  await moveTo(page, kill, 900)
  await highlight(kill)
  await at(when('safety', 'Below is'))
  await highlight(kill, false)
  await moveTo(page, cap, 800)
  await highlight(cap)
  await at(when('safety', 'These settings'))
  await highlight(cap, false)
  await at(when('safety', 'More help'))
  const help = page.locator('aside nav a[href="/admin/help"]').first()
  await moveTo(page, help, 900)
  await highlight(help)
  await at(dur('safety') - 0.8)
  await highlight(help, false)
})

await unhighlightAll()
await assertNothingBlocked()
const expected = ['POST /api/admin/crm/contacts/ingest', 'POST /api/admin/crm/contacts/' + CID + '/channels', 'POST /api/admin/crm/contacts/' + CID + '/lifecycle', 'POST /api/admin/crm/contacts/' + CID + '/outreach/preview']
console.log('  CRM write requests:', writes)
if (JSON.stringify([...writes].sort()) !== JSON.stringify([...expected].sort())) throw new Error(`unexpected CRM write requests: ${JSON.stringify(writes)}`)
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
