// Recorder for team video 5 "CRM: organisations and outreach" (F8960 Team-SOPs & Admin-Hilfe; re-recorded after the F7600 org cut).
// Usage: node record.mjs en
// STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run, privacy check per scene: e-mail outside
// @pundo-e2e.io or visible password field = abort), admin login via API, demo data from ../team-common/prepare_team.py (marker
// "Team Demo"). The organisation list and the review list hold real data of the prod copy: every table row / review entry without
// "Team Demo" is blurred by a persistent MutationObserver (armMask) the moment it is rendered.
// What is DONE here (test DB only): organisation "Team Demo Cafe" created through the form; "Confirm business" on "Team Demo Bakery"
// (NEEDS_REVIEW -> QUEUED); one outreach preview; ONE send approval for the red relation e-mail of Petros. prepare_team.py puts
// everything back on the next run.
// What is NEVER done: sending (the "Send email" button is only hovered), suppressing (dialog cancelled), changing the safety
// settings, channel or relation changes. Safety net: a fetch wrapper in the page rejects every write request to outreach/send,
// suppress, crm/config and opt-out before it leaves the browser, and the run aborts if one was attempted; at the end the list of
// CRM write requests must be exactly the expected one.
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

// ---- test-DB preparation (pundo_test only; the script refuses everything else): resets the demo CRM, removes the created org ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  demo = JSON.parse(out.at(-1))
  console.log('  prepare: crm', JSON.stringify(demo.crm), 'new_org', JSON.stringify(demo.new_org))
}
const HEAD = demo.crm.orgs.head
const PETROS_REL = demo.crm.relations['petros@head']
const ELENI_REL = demo.crm.relations['eleni@head']
const LIST = '/admin/crm/orgs'
const NEW = '/admin/crm/orgs/new'
const DETAIL = `/admin/crm/orgs/${HEAD}`
const REVIEW = '/admin/crm/review'
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
const norm = (s) => s.replace(/[.,:;"!?“”]/g, '').toLowerCase()
const when = (id, phrase) => {
  const w = words(id), p = phrase.split(' ')
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => norm(w[i + k][2]) === norm(x))) return lead + w[i][0]
  throw new Error(`phrase "${phrase}" not found in narration of ${id}`)
}

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm() would be dismissed = "no"

// ---- safety net: nothing that goes outside or cannot be undone leaves the browser ----
await page.addInitScript(() => {
  const BLOCK = /\/api\/admin\/crm\/(orgs\/\d+\/(outreach\/send|suppress|channels.*)|persons\/\d+\/opt-out|config|relations.*|channels.*)$/
  const orig = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input.url
    const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
    if (method !== 'GET' && BLOCK.test(new URL(url, location.href).pathname)) {
      try { const k = '__vidBlocked'; sessionStorage.setItem(k, JSON.stringify([...(JSON.parse(sessionStorage.getItem(k) || '[]')), method + ' ' + url])) } catch { /* sessionStorage unavailable: the request log below still catches it */ }
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

const tid = (id) => page.locator(`[data-testid="${id}"]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
/** Persistent guard: a MutationObserver blurs every table row and review entry without the demo marker the moment React (re)renders it
 *  (lost on a full page load: call again). */
const ROWS = 'tbody tr, [data-testid="crm-review-list"] > li'
const armMask = () => page.evaluate(([keep, sel]) => {
  const run = () => document.querySelectorAll(sel).forEach((el) => {
    if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
  })
  if (!window.__vidMaskObs) {
    window.__vidMaskObs = new MutationObserver(run)
    window.__vidMaskObs.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  run()
}, [MARK, ROWS])
/** Scroll the scrolling ancestor of <main> smoothly to y. */
const scrollTo = (y, ms = 700) => page.evaluate(([y, ms]) => new Promise((res) => {
  let el = document.querySelector('main')
  while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement
  const sc = el || document.scrollingElement
  const from = sc.scrollTop, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (y - from) * e
    if (k < 1) requestAnimationFrame(step); else res()
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

/** Hidden navigation before a scene (frames before the scene start are not used). Blur only on list pages. */
async function visit(p, ready, mask = p === LIST || p.startsWith(REVIEW)) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (mask) await armMask()
  if (ready) await ready()
  await sleep(300)
  await thaw()
}
/** List rule: at least one demo row; everything else is blurred (the observer does it, the counts are logged). */
const requireDemoRows = async (what, sel = 'tbody tr') => {
  const n = await page.locator(sel, { hasText: MARK }).count()
  const all = await page.locator(sel).count()
  console.log(`  ${what}: ${n} demo row(s) of ${all}`)
  if (n === 0) throw new Error(`${what}: no demo row found - run prepare_team.py`)
  const masked = await page.locator(`${sel}[data-vid-masked]`).count()
  if (masked !== all - n) throw new Error(`${what}: ${all - n} real rows but only ${masked} blurred`)
}
/** Lead status badge next to the h1 of the organisation page. */
const badge = () => page.locator('h1').first().locator('xpath=following-sibling::div').locator('span').last()
const readBadge = async () => (await badge().innerText()).trim()
const section = (h2) => page.locator('section', { has: page.locator('h2', { hasText: h2 }) }).first()

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

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of [LIST, `${LIST}?lead_only=true`, `${LIST}?q=Team+Demo`, NEW, DETAIL, REVIEW, `${REVIEW}?category=relations_without_role`, SETTINGS]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}
writes.length = 0

// 1 list -------------------------------------------------------------------------------------------------------
await runScene(sess, 'list', dur('list'), () => visit(LIST, () => requireDemoRows('org list')), async (at) => {
  const table = page.locator('table').first()
  await at(when('list', 'The CRM holds'))
  await moveTo(page, table, 900)
  await at(when('list', 'Each row'))
  const head = page.locator('thead th').nth(2)
  await moveTo(page, head, 700)
  await highlight(head)
  await at(when('list', 'The chips'))
  await highlight(head, false)
  const chips = tid('crm-org-filters')
  await moveTo(page, chips.locator('a').nth(3), 800)
  await highlight(chips)
  await at(when('list', 'and Only'))
  await highlight(chips, false)
  const toggle = page.getByRole('link', { name: 'Only acquisition targets', exact: true })
  await moveTo(page, toggle, 700)
  await highlight(toggle)
  await sleep(500)
  await highlight(toggle, false)
  await goClick(toggle, (u) => u.searchParams.get('lead_only') === 'true', () => requireDemoRows('org list (acquisition targets)'))
  await at(when('list', 'Real rows'))
  await moveTo(page, table, 800)
  await highlight(table)
  await at(dur('list') - 0.8)
  await highlight(table, false)
})

// 2 search -----------------------------------------------------------------------------------------------------
await runScene(sess, 'search', dur('search'), () => visit(LIST, () => requireDemoRows('org list')), async (at) => {
  const input = page.locator('input[name="q"]').first()
  await at(when('search', 'type at'))
  await click(page, input)
  await page.keyboard.type('Team Demo', { delay: 80 })
  await at(when('search', 'and press'))
  await sleep(250)
  await sess.pause()                                       // GET form = full page load, hidden by the freeze
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.get('q') === 'Team Demo', { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  await armMask()
  const rows = page.locator('tbody tr')
  const names = (await rows.allInnerTexts()).map((t) => t.split('\n')[0].trim())
  console.log('  search hits:', names)
  if ((await rows.count()) !== 3 || (await page.locator('tbody tr', { hasText: MARK }).count()) !== 3) throw new Error('search "Team Demo" must find exactly the three demo organisations')
  await sess.resume()
  const row = (name) => page.locator('tbody tr').filter({ has: page.getByRole('link', { name, exact: true }) }).first()
  await at(when('search', 'the head office'))
  await moveTo(page, row('Team Demo Bakery').locator('td').nth(2), 800)
  await highlight(row('Team Demo Bakery').locator('td').nth(2))
  await at(when('search', 'its branch'))
  await highlight(row('Team Demo Bakery').locator('td').nth(2), false)
  const branchCell = row('Team Demo Bakery Larnaca').locator('td').first()
  await moveTo(page, branchCell, 800)
  await highlight(branchCell)
  await at(when('search', 'and the accounting'))
  await highlight(branchCell, false)
  const empCell = row('Team Demo Accounting Office').locator('td').nth(2)
  await moveTo(page, empCell, 800)
  await highlight(empCell)
  await at(when('search', 'Only if'))
  await highlight(empCell, false)
  const add = page.getByRole('link', { name: '+ Add organisation' }).first()
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
  await click(page, f('name'))
  await typeText(page, 'Team Demo Cafe', 55)
  await click(page, f('city'), 400)
  await typeText(page, 'Limassol', 55)
  await click(page, f('category'), 400)
  await typeText(page, 'Cafe', 55)
  await at(when('create', 'Acquisition target'))
  const asLead = page.getByRole('checkbox', { name: /Acquisition target/ })
  if (!(await asLead.isChecked())) throw new Error('"Acquisition target" is not ticked by default (narration says so)')
  const lbl = asLead.locator('xpath=ancestor::label[1]')
  await moveTo(page, lbl, 700)                              // hover only: it stays ticked
  await highlight(lbl)
  await at(when('create', 'and then give'))
  await highlight(lbl, false)
  await click(page, f('email'))
  await typeText(page, 'cafe@pundo-e2e.io', 45)
  await at(when('create', 'Untick it'))
  await moveTo(page, asLead, 700)
  await highlight(lbl)
  await at(when('create', 'Choose the'))
  await highlight(lbl, false)
  if (!(await asLead.isChecked())) throw new Error('"Acquisition target" got unticked')
  const sel = page.locator('#org_source_select')
  await moveTo(page, sel, 700)
  await highlight(sel)
  await sel.selectOption('manual')                          // set without opening the native list
  if ((await sel.locator('option:checked').innerText()).trim() !== 'Direct contact') throw new Error('source "Direct contact" not selected')
  await at(when('create', 'and click'))
  await highlight(sel, false)
  const submit = page.getByRole('button', { name: 'Create organisation', exact: true })
  const { x, y } = await moveTo(page, submit, 700)
  await highlight(submit)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(250)
  await freeze()                                            // freeze BEFORE the click: the page then moves on to the new org (other address bar)
  await page.mouse.click(x, y)                              // POST /crm/orgs
  await page.waitForURL((u) => /^\/admin\/crm\/orgs\/\d+$/.test(u.pathname) && !u.pathname.endsWith(`/${HEAD}`), { timeout: 30000 })
  createdId = Number(new URL(page.url()).pathname.split('/').pop())
  await page.locator('h1', { hasText: 'Team Demo Cafe' }).waitFor({ timeout: 30000 })
  const st = await readBadge()
  console.log(`  created org #${createdId}, lead status "${st}"`)
  if (st !== 'Sourced') throw new Error(`new organisation is "${st}", expected "Sourced"`)
})

// 4 detail -----------------------------------------------------------------------------------------------------
await runScene(sess, 'detail', dur('detail'), () => visit(DETAIL, async () => {
  const st = await readBadge()
  if (st !== 'Needs review') throw new Error(`demo org is "${st}", expected "Needs review" - run prepare_team.py (no SKIP_PREPARE)`)
  if (!(await tid('crm-org-parent').innerText()).includes('Team Demo Bakery Larnaca')) throw new Error('head office does not list its branch')
}), async (at) => {
  const head = page.locator('h1').first().locator('xpath=..')
  await at(when('detail', 'its name'))
  await moveTo(page, head, 800)
  await highlight(head)
  await at(when('detail', 'The sections'))
  await highlight(head, false)
  const parts = [section('Lead status and actions'), section('Master data'), tid('crm-org-parent'), section('Channels of the organisation'),
    tid('crm-contact-persons'), section('Sources and proofs'), section('Outreach')]
  const a = A('detail'), t0 = when('detail', 'The sections'), t1 = when('detail', 'Team Demo')
  for (let i = 0; i < parts.length; i++) {
    await at(t0 + (i * (t1 - t0 - 0.5)) / parts.length)
    if (i > 0) await highlight(parts[i - 1], false)
    if (i < 6) await scrollToEl(parts[i], 90, 500)
    await moveTo(page, parts[i].locator('h2').first(), 350)
    await highlight(parts[i])
  }
  await at(when('detail', 'Team Demo'))
  await highlight(parts.at(-1), false)
  const parent = tid('crm-org-parent')
  await scrollToEl(parent, 120, 700)
  await moveTo(page, parent.getByRole('link', { name: 'Team Demo Bakery Larnaca' }), 700)
  await highlight(parent)
  await at(lead + a + T.tail_s - 0.8)
  await highlight(parent, false)
})

// 5 lead (Confirm business: NEEDS_REVIEW -> QUEUED) -----------------------------------------------------------
await runScene(sess, 'lead', dur('lead'), () => visit(DETAIL, async () => {
  const st = await readBadge()
  if (st !== 'Needs review') throw new Error(`demo org is "${st}", expected "Needs review"`)
}), async (at) => {
  await at(when('lead', 'The lead'))
  await moveTo(page, badge(), 800)
  await highlight(badge())
  await at(when('lead', 'the organisation waits'))
  const actions = tid('crm-lead-actions')
  await moveTo(page, actions, 800)
  await at(when('lead', 'We checked'))
  await highlight(badge(), false)
  await click(page, actions.getByRole('button', { name: 'Confirm business', exact: true }))
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  await at(when('lead', 'and confirm'))
  await click(page, dialog.getByRole('button', { name: 'Confirm business', exact: true }), 500)
  await page.waitForFunction(() => /Queued/.test(document.querySelector('h1')?.parentElement?.textContent || ''), null, { timeout: 30000 })
  await at(when('lead', 'The organisation moves'))
  await moveTo(page, badge(), 700)
  await highlight(badge())
  await at(when('lead', 'Set lead status chooses'))
  await highlight(badge(), false)
  const setBtn = actions.getByRole('button', { name: 'Set lead status', exact: true })
  await moveTo(page, setBtn, 700)                          // hover only
  await highlight(setBtn)
  await at(dur('lead') - 0.8)
  await highlight(setBtn, false)
})

// 6 channels ---------------------------------------------------------------------------------------------------
await runScene(sess, 'channels', dur('channels'), () => visit(DETAIL, async () => {
  if ((await readBadge()) !== 'Queued') throw new Error('demo org is not "Queued" (scene lead failed?)')
}), async (at) => {
  const orgCh = section('Channels of the organisation')
  await at(when('channels', 'A channel'))
  await scrollToEl(orgCh, 90, 800)
  await at(when('channels', 'Company channels'))
  const table = orgCh.locator('table').first()
  await moveTo(page, table.locator('tbody tr').first(), 800)
  await highlight(table)
  await at(when('channels', 'with type'))
  await moveTo(page, table.locator('thead').first(), 700)
  await at(when('channels', 'Under Contact'))
  await highlight(table, false)
  const card = tid(`relation-${PETROS_REL}`)
  await scrollToEl(card, 90, 800)
  const relTable = tid(`crm-channels-relation-${PETROS_REL}`)
  await moveTo(page, relTable, 800)
  await highlight(relTable)
  await at(when('channels', 'and below'))
  await highlight(relTable, false)
  const personal = card.locator('ul[aria-label="Personal"]').first()
  await moveTo(page, personal, 800)
  await highlight(personal)
  await at(when('channels', 'Video 5b'))
  await highlight(personal, false)
  await moveTo(page, card, 700)
  await at(dur('channels') - 0.8)
})

// 7 outreach + send gate (approval yes, sending NEVER) ---------------------------------------------------------
await runScene(sess, 'outreach', dur('outreach'), () => visit(DETAIL), async (at) => {
  const box = section('Outreach')
  const select = box.getByLabel('Recipient', { exact: true })
  await at(when('outreach', 'In Outreach'))
  await scrollToEl(box, 90, 700)
  await moveTo(page, box.locator('h2').first(), 700)
  await highlight(box)
  await at(when('outreach', 'pick the'))
  await highlight(box, false)
  await moveTo(page, select, 700)
  await highlight(select)
  const options = await select.locator('option').allInnerTexts()
  console.log('  recipients:', options)
  if (options.some((o) => !/@pundo-e2e\.io/.test(o))) throw new Error('a recipient outside the demo domain - privacy abort')
  if (!/info\.bakery@pundo-e2e\.io \(organisation\) — default/.test(options[0] || (await select.locator('option:checked').innerText()))) console.log('  !! default recipient label unexpected')
  await at(when('outreach', 'We choose'))
  const petros = await select.locator('option', { hasText: 'petros.bakery@pundo-e2e.io' }).getAttribute('value')
  await select.selectOption(petros)                         // set without opening the native list
  await at(when('outreach', 'Its legal'))
  await highlight(select, false)
  const tier = tid('crm-outreach-tier')
  await moveTo(page, tier, 600)
  await highlight(tier)
  if ((await tier.innerText()).trim() !== 'Legal tier: Red') throw new Error(`tier badge "${await tier.innerText()}", expected Red`)
  const gate = tid('crm-outreach-gate')
  if ((await gate.getAttribute('role')) !== 'alert') throw new Error('send gate is not blocking')
  await sleep(900)
  await highlight(tier, false)
  await moveTo(page, gate, 600)
  await highlight(gate)
  const send = box.getByRole('button', { name: 'Send email', exact: true })
  await sleep(1200)
  await highlight(gate, false)
  await moveTo(page, send, 700)                            // hover only
  if (await send.isEnabled()) throw new Error('"Send email" is enabled without approval')
  await at(when('outreach', 'An admin'))
  await click(page, gate.getByRole('button', { name: 'Approve', exact: true }))
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  await at(when('outreach', 'writes a'))
  await click(page, dialog.locator('textarea'), 500)
  await typeText(page, 'Petros asked for our offer at the bakery fair (demo).', 32)
  await at(when('outreach', 'and confirms'))
  await click(page, dialog.getByRole('button', { name: 'Approve', exact: true }), 500)   // POST outreach/approve
  await dialog.waitFor({ state: 'detached', timeout: 30000 })
  await page.waitForFunction(() => /Approved by admin/.test(document.querySelector('[data-testid="crm-outreach-gate"]')?.textContent || ''), null, { timeout: 30000 })
  await at(when('outreach', 'One approval'))
  await moveTo(page, gate, 700)
  await highlight(gate)
  await at(when('outreach', 'Then load'))
  await highlight(gate, false)
  await click(page, box.getByRole('button', { name: 'English', exact: true }), 500)
  await click(page, box.getByRole('button', { name: 'Load preview', exact: true }), 500)   // POST outreach/preview
  await box.getByText('Preview loaded').waitFor({ timeout: 30000 })
  const body = box.locator('textarea')
  if (!(await body.inputValue()).trim()) throw new Error('preview body is empty')
  await moveTo(page, body, 700)
  await highlight(body)
  await at(when('outreach', 'is active'))
  await highlight(body, false)
  await moveTo(page, send, 700)                            // hover only: NEVER clicked (a real e-mail would be sent)
  if (!(await send.isEnabled())) throw new Error('"Send email" stays disabled after the approval')
  await highlight(send)
  await at(dur('outreach') - 0.8)
  await highlight(send, false)
})

// 8 opt-out (dialog opened and CANCELLED; the opted-out demo person) -------------------------------------------
await runScene(sess, 'optout', dur('optout'), () => visit(DETAIL), async (at) => {
  const actions = tid('crm-lead-actions')
  const btn = actions.getByRole('button', { name: 'Suppress / Opt-out', exact: true })
  await at(when('optout', 'An opt-out'))
  await scrollToEl(actions, 160, 600)
  await moveTo(page, btn, 800)
  await highlight(btn)
  await at(when('optout', 'or an unsubscribe'))
  await highlight(btn, false)
  await click(page, btn)
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  const radios = dialog.locator('label')
  await moveTo(page, radios.nth(0), 600)                   // hover only: nothing is chosen
  await highlight(radios.nth(0))
  await at(when('optout', 'We cancel'))
  await highlight(radios.nth(0), false)
  await click(page, dialog.getByRole('button', { name: 'Cancel', exact: true }))
  await dialog.waitFor({ state: 'detached', timeout: 10000 })
  if ((await readBadge()) !== 'Queued') throw new Error('lead status changed during the opt-out scene')
  await at(when('optout', 'An unsubscribe through a channel of a'))
  const card = tid(`relation-${ELENI_REL}`)
  await scrollToEl(card, 140, 800)
  await moveTo(page, card, 700)
  await at(when('optout', 'Eleni shows'))
  const optBadge = card.getByText('Opted out', { exact: true })
  await moveTo(page, optBadge, 600)
  await highlight(card)
  await at(when('optout', 'Exception'))
  await highlight(card, false)
  const petrosCard = tid(`relation-${PETROS_REL}`)
  await moveTo(page, petrosCard.locator('[aria-label="Roles"]').first(), 700)
  await at(dur('optout') - 0.8)
})

// 9 review list (entries of real people blurred) ---------------------------------------------------------------
await runScene(sess, 'review', dur('review'), () => visit(REVIEW, async () => {
  const n = await page.locator('[data-testid="crm-review-list"] > li').count()
  const masked = await page.locator('[data-testid="crm-review-list"] > li[data-vid-masked]').count()
  const demoN = await page.locator('[data-testid="crm-review-list"] > li', { hasText: MARK }).count()
  console.log(`  review (legacy): ${n} entries, ${masked} blurred, ${demoN} demo`)
  if (masked !== n - demoN) throw new Error('review list: not every real entry is blurred')
}), async (at) => {
  const nav = page.getByRole('navigation', { name: 'Review list' })
  await at(when('review', 'The review'))
  await moveTo(page, nav, 800)
  await highlight(nav)
  await at(when('review', 'such as'))
  await highlight(nav, false)
  const tab = (name) => nav.getByRole('link', { name, exact: true })
  await moveTo(page, tab('Legacy cases'), 600)
  await highlight(tab('Legacy cases'))
  await at(when('review', 'and unclear'))
  await highlight(tab('Legacy cases'), false)
  await moveTo(page, tab('Check channel assignment'), 600)
  await highlight(tab('Check channel assignment'))
  await at(when('review', 'Here we'))
  await highlight(tab('Check channel assignment'), false)
  await goClick(tab('Relations without role'), (u) => u.searchParams.get('category') === 'relations_without_role',
    () => requireDemoRows('review (relations without role)', '[data-testid="crm-review-list"] > li'))
  const entry = page.locator('[data-testid="crm-review-list"] > li', { hasText: 'Team Demo Nikos' }).first()
  await moveTo(page, entry, 800)
  await highlight(entry)
  await at(when('review', 'It disappears'))
  await moveTo(page, entry.getByText(/Disappears by itself/), 700)
  await at(when('review', 'Entries of'))
  await highlight(entry, false)
  await moveTo(page, page.locator('[data-testid="crm-review-list"]'), 700)
  await at(dur('review') - 0.8)
})

// 10 safety (only looked at) -----------------------------------------------------------------------------------
await runScene(sess, 'safety', dur('safety'), () => visit(SETTINGS, async () => {
  await page.getByText('Sending is active.').waitFor({ timeout: 15000 })   // the sentence "pauses all sending" is shown with sending active
  await page.getByText(/^On: the organisation gets/).waitFor({ timeout: 15000 })   // "on by default" must be true
  const checked = await page.locator('main fieldset input[type=checkbox]').evaluateAll((els) => els.map((e) => e.checked))
  if (JSON.stringify(checked) !== JSON.stringify([false, false, true])) throw new Error(`approval tiers are ${JSON.stringify(checked)}, expected only red`)
}), async (at) => {
  const sections = page.locator('main section')
  const [kill, cap, owner, tiers] = [0, 1, 2, 3].map((i) => sections.nth(i))
  for (const [phrase, el, prev] of [['the kill', kill, null], ['and below', cap, kill], ['The owner', owner, cap], ['and only', tiers, owner]]) {
    await at(when('safety', phrase))
    if (prev) await highlight(prev, false)
    await scrollToEl(el, 120, 500)
    await moveTo(page, el, 700)
    await highlight(el)
  }
  await at(when('safety', 'These settings'))
  await highlight(tiers, false)
  await at(when('safety', 'The written'))
  const help = page.locator('aside nav a[href="/admin/help"]').first()
  await moveTo(page, help, 900)
  await highlight(help)
  await at(dur('safety') - 0.8)
  await highlight(help, false)
})

await unhighlightAll()
await assertNothingBlocked()
const expected = ['POST /api/admin/crm/orgs', `POST /api/admin/crm/orgs/${HEAD}/confirm-business`,
  `POST /api/admin/crm/orgs/${HEAD}/outreach/approve`, `POST /api/admin/crm/orgs/${HEAD}/outreach/preview`]
console.log('  CRM write requests:', writes)
if (JSON.stringify([...writes].sort()) !== JSON.stringify([...expected].sort())) throw new Error(`unexpected CRM write requests: ${JSON.stringify(writes)}`)
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
