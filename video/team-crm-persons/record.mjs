// Recorder for team video 5b "CRM: people and relations" (F8960 Team-SOPs & Admin-Hilfe; re-recorded after the F7600 org cut, AC 48).
// Usage: node record.mjs en
// Same rules as ../team-crm/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run, privacy
// check per scene, admin login via API), demo data from ../team-common/prepare_team.py (marker "Team Demo"). The people list holds real
// people of the prod copy: every table row without "Team Demo" is blurred by a persistent MutationObserver (armMask).
// What is DONE (test DB only): person "Anna Team Demo" created through the form; the free name of "Team Demo Nikos" replaced by first and
// last name; a relation of Petros to "Team Demo Accounting Office" added (no role), role "Advisor" added, relation ended; the info
// address of the bakery chosen as preferred channel of Petros' relation to the bakery (after the refused copy). prepare_team.py puts
// everything back / deletes Anna on the next run.
// What is NEVER done: opt-out, sending, deleting a person, channel moves. A fetch wrapper in the page rejects every write to outreach/send,
// suppress, opt-out, person delete, channel move and crm/config; the run aborts if one was attempted, and the list of CRM write requests
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

// ---- test-DB preparation (pundo_test only; the script refuses everything else): resets the demo people, removes the created one ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  demo = JSON.parse(out.at(-1))
  console.log('  prepare: crm', JSON.stringify(demo.crm), 'new_person', JSON.stringify(demo.new_person))
}
const PETROS = demo.crm.persons.petros
const NIKOS = demo.crm.persons.nikos
const PETROS_HEAD_REL = demo.crm.relations['petros@head']
const PEOPLE = '/admin/crm/persons'
const NEWP = '/admin/crm/persons/new'
const PERSON = `/admin/crm/persons/${PETROS}`
const NIKOS_P = `/admin/crm/persons/${NIKOS}`
const HELP = '/admin/help/crm-persons'
// the address bar of the id scenes shows these ids (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [PERSON, NIKOS_P]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

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
  const BLOCK = /\/api\/admin\/crm\/(orgs\/\d+\/(outreach\/send|suppress)|persons\/\d+(\/opt-out)?|channels\/\d+\/move|config)$/
  const orig = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input.url
    const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
    const p = new URL(url, location.href).pathname
    // PATCH /persons/{id} (master data) is allowed; DELETE /persons/{id} and POST …/opt-out are not
    if (method !== 'GET' && BLOCK.test(p) && !(method === 'PATCH' && /\/persons\/\d+$/.test(p))) {
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
/** Persistent guard: a MutationObserver blurs every table row without the demo marker the moment React (re)renders it (lost on a full page load: call again). */
const armMask = () => page.evaluate((keep) => {
  const run = () => document.querySelectorAll('tbody tr').forEach((el) => {
    if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
  })
  if (!window.__vidMaskObs) {
    window.__vidMaskObs = new MutationObserver(run)
    window.__vidMaskObs.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
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

/** Hidden navigation before a scene (frames before the scene start are not used). */
async function visit(p, ready, mask = p === PEOPLE) {   // blur only on the list (a person page holds only demo data)
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
const section = (h2) => page.locator('section', { has: page.locator('h2', { hasText: h2 }) }).first()
const relationsBox = () => section('Relations to organisations')
const masterForm = () => page.locator('form', { has: page.locator('h2', { hasText: 'Master data' }) }).first()

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of [PEOPLE, `${PEOPLE}?q=Team+Demo`, NEWP, NIKOS_P, PERSON, HELP]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}
writes.length = 0

// 1 people -----------------------------------------------------------------------------------------------------
await runScene(sess, 'people', dur('people'), () => visit(PEOPLE, () => requireDemoRows('people list')), async (at) => {
  const table = page.locator('table').first()
  await at(when('people', 'A person is'))
  await moveTo(page, table, 900)
  await at(when('people', 'The list'))
  const head = page.locator('thead').first()
  await moveTo(page, head, 700)
  await highlight(head)
  await at(when('people', 'Search first'))
  await highlight(head, false)
  const input = page.locator('input[name="q"]').first()
  await click(page, input)
  await page.keyboard.type('Team Demo', { delay: 80 })
  await at(when('people', 'and click'))
  const btn = page.getByRole('button', { name: 'Search', exact: true })
  await click(page, btn)
  await sleep(220)
  await sess.pause()                                       // GET form = full page load, hidden by the freeze
  await page.waitForURL((u) => u.searchParams.get('q') === 'Team Demo', { timeout: 30000 })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  await armMask()
  const names = await page.locator('tbody tr td:nth-child(2)').allInnerTexts()
  console.log('  person search hits:', names)
  if (names.length !== 3 || names.some((t) => !t.includes(MARK))) throw new Error('search "Team Demo" must find exactly the three demo people')
  await sess.resume()
  const eleni = page.locator('tbody tr', { hasText: 'Team Demo Eleni' }).first()
  await moveTo(page, eleni.getByText('Opted out', { exact: true }), 800)
  await highlight(eleni.locator('td').nth(1))
  await at(when('people', 'Real rows'))
  await highlight(eleni.locator('td').nth(1), false)
  await moveTo(page, page.locator('tbody tr', { hasText: 'Petros Team Demo' }).locator('td').nth(2), 700)
  await at(dur('people') - 0.8)
})

// 2 create -----------------------------------------------------------------------------------------------------
let createdId = null
await runScene(sess, 'create', dur('create'), () => visit(NEWP), async (at) => {
  const field = (label) => page.getByLabel(label, { exact: true })
  await at(when('create', 'If you'))
  await click(page, field('First name'))
  await typeText(page, 'Anna', 70)
  await click(page, field('Last name'), 400)
  await typeText(page, 'Team Demo', 60)
  await at(when('create', 'The name is'))
  const nameField = field('Name')
  if ((await nameField.inputValue()) !== 'Anna Team Demo' || (await nameField.getAttribute('readonly')) === null) throw new Error('"Name" is not built and locked')
  await moveTo(page, nameField, 600)
  await highlight(nameField)
  await at(when('create', 'Choose a'))
  await highlight(nameField, false)
  const sal = page.locator('label', { hasText: /^Salutation/ }).locator('select').first()   // label text includes the option texts
  await moveTo(page, sal, 600)
  await highlight(sal)
  await sal.selectOption('ms')                              // set without opening the native list
  await at(when('create', 'The birthday'))
  await highlight(sal, false)
  await click(page, field('Day'), 500)
  await typeText(page, '14', 90)
  const month = page.locator('label', { hasText: /^Month/ }).locator('select').first()
  await moveTo(page, month, 500)
  await month.selectOption('3')
  await at(when('create', 'with Year'))
  const unknown = page.getByRole('checkbox', { name: 'Year unknown', exact: true })
  await click(page, unknown, 500)
  if ((await field('Year').count()) !== 0) throw new Error('"Year unknown" did not hide the year field')
  await highlight(unknown.locator('xpath=ancestor::fieldset[1]'))
  await at(when('create', 'A personal'))
  await highlight(unknown.locator('xpath=ancestor::fieldset[1]'), false)
  await click(page, field('Email address'), 500)
  await typeText(page, 'anna@pundo-e2e.io', 45)
  await at(when('create', 'Click Add'))
  const submit = page.getByRole('button', { name: 'Add person', exact: true })
  const { x, y } = await moveTo(page, submit, 700)
  await highlight(submit)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(250)
  await freeze()                                            // freeze BEFORE the click: the page then moves on to the new person (other address bar)
  await page.mouse.click(x, y)                              // POST /crm/persons
  await page.waitForURL((u) => /^\/admin\/crm\/persons\/\d+$/.test(u.pathname), { timeout: 30000 })
  createdId = Number(new URL(page.url()).pathname.split('/').pop())
  await page.locator('h1', { hasText: 'Anna Team Demo' }).waitFor({ timeout: 30000 })
  const bday = (await tid('person-birthday').innerText()).trim()
  console.log(`  created person #${createdId}, birthday "${bday}"`)
  if (bday !== '14 March') throw new Error(`birthday shows "${bday}", expected "14 March"`)
})

// 3 name: free name -> first/last name ("Replace name") ---------------------------------------------------------
await runScene(sess, 'name', dur('name'), () => visit(NIKOS_P, async () => {
  if (!(await page.locator('h1', { hasText: 'Team Demo Nikos' }).count())) throw new Error('demo person Nikos has no free name - run prepare_team.py (no SKIP_PREPARE)')
}), async (at) => {
  const form = masterForm()
  const field = (label) => form.getByLabel(label, { exact: true })
  await at(when('name', 'This person'))
  await moveTo(page, page.locator('h1').first(), 700)
  await highlight(page.locator('h1').first())
  await at(when('name', 'If the'))
  await highlight(page.locator('h1').first(), false)
  await scrollToEl(form, 90, 800)
  await moveTo(page, field('Name'), 700)
  await highlight(field('Name'))
  await at(when('name', 'Here we'))
  await highlight(field('Name'), false)
  await click(page, field('First name'))
  await typeText(page, 'Nikos', 70)
  await click(page, field('Last name'), 400)
  await typeText(page, 'Team Demo', 60)
  await at(when('name', 'A hint'))
  const notice = form.getByText(/Saving replaces the current name/)
  await moveTo(page, notice, 600)
  await highlight(notice)
  await at(when('name', 'After Save'))
  await highlight(notice, false)
  await click(page, form.getByRole('button', { name: 'Save', exact: true }))
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  await at(when('name', 'and we confirm'))
  await click(page, dialog.getByRole('button', { name: 'Replace name', exact: true }), 500)   // PATCH /crm/persons/{id}
  await page.locator('h1', { hasText: 'Nikos Team Demo' }).waitFor({ timeout: 30000 })
  await at(when('name', 'The heading'))
  await scrollTo(0, 600)
  await moveTo(page, page.locator('h1').first(), 600)
  await highlight(page.locator('h1').first())
  await at(when('name', 'and the field'))
  await highlight(page.locator('h1').first(), false)
  await scrollToEl(form, 90, 600)
  if ((await field('Name').getAttribute('readonly')) === null) throw new Error('"Name" is not locked after the split')
  await moveTo(page, field('Name'), 600)
  await highlight(field('Name'))
  await at(dur('name') - 0.8)
  await highlight(field('Name'), false)
})

// 4 relations: area manager, new relation without role, add a role, end the relation ---------------------------------
await runScene(sess, 'relations', dur('relations'), () => visit(PERSON, async () => {
  if (!(await page.locator('h1', { hasText: 'Petros Team Demo' }).count())) throw new Error('demo person page has the wrong name')
  if ((await tid('person-birthday').innerText()).trim() !== '14 March') throw new Error('Petros has no birthday "14 March"')
  if ((await relationsBox().locator('li[data-testid^="relation-"]').count()) !== 2) throw new Error('Petros must have exactly two relations - run prepare_team.py (no SKIP_PREPARE)')
}), async (at) => {
  const facts = page.locator('main section').first()
  await at(when('relations', 'Petros has'))
  await moveTo(page, tid('person-birthday'), 700)
  await highlight(facts)
  await at(when('relations', 'A relation'))
  await highlight(facts, false)
  const box = relationsBox()
  await scrollToEl(box, 90, 800)
  const cards = box.locator('li[data-testid^="relation-"]')
  await at(when('relations', 'He is'))
  await moveTo(page, cards.nth(0).locator('[aria-label="Roles"]'), 700)
  await highlight(cards.nth(0))
  await at(when('relations', 'one to the branch'))
  await highlight(cards.nth(0), false)
  await moveTo(page, cards.nth(1).locator('[aria-label="Roles"]'), 600)
  await highlight(cards.nth(1))
  await at(when('relations', 'and the area'))
  await moveTo(page, cards.nth(1).getByText('Region West'), 600)
  await at(when('relations', 'Roles have'))
  await highlight(cards.nth(1), false)
  await moveTo(page, cards.nth(0).getByText(/^Period:/), 700)
  await highlight(cards.nth(0).getByText(/^Period:/))
  await at(when('relations', 'Now we'))
  await highlight(cards.nth(0).getByText(/^Period:/), false)
  const addForm = box.locator('form', { has: page.locator('h3', { hasText: 'Add relation' }) }).first()
  await scrollToEl(addForm, 200, 700)
  await click(page, page.locator('#person-org'))
  const search = page.locator('input[aria-label="Organisation"]')
  await search.waitFor()
  await search.focus()                                     // the combobox focuses its input one tick later: otherwise the first letter is lost
  await sleep(250)
  await typeText(page, 'Team Demo Acc', 75)
  const opts = page.locator('[role=listbox] [role=option]')
  await opts.first().waitFor({ timeout: 15000 })
  const optTexts = await opts.allInnerTexts()
  console.log('  org hits:', optTexts.map((t) => t.replace(/\s+/g, ' ')))
  if (optTexts.some((t) => !t.includes(MARK))) throw new Error('org search shows a non-demo organisation - privacy abort')
  await click(page, opts.filter({ hasText: 'Team Demo Accounting Office' }).first(), 500)
  await click(page, addForm.locator('#person-relation-note'), 500)
  await typeText(page, 'Bookkeeping questions (demo)', 40)
  if (await addForm.locator('input[type=checkbox]:checked').count()) throw new Error('a role is ticked in the new relation')
  await click(page, addForm.getByRole('button', { name: 'Add relation', exact: true }), 500)   // POST /crm/relations
  const card = box.locator('li[data-testid^="relation-"]', { hasText: 'Team Demo Accounting Office' }).first()
  await card.waitFor({ timeout: 30000 })
  await at(when('relations', 'The new'))
  await scrollToEl(card, 140, 700)
  const missing = card.getByText('Role missing', { exact: true })
  await moveTo(page, missing, 600)
  await highlight(missing)
  await at(when('relations', 'and we add'))
  await highlight(missing, false)
  const roleSel = card.locator('select[id$="-role"]').first()
  await moveTo(page, roleSel, 500)
  await roleSel.selectOption('advisor')                    // set without opening the native list
  await click(page, card.getByRole('button', { name: 'Add role', exact: true }), 400)   // POST /crm/relations/{id}/roles
  await card.getByRole('button', { name: 'Remove role Advisor', exact: true }).waitFor({ timeout: 30000 })
  await highlight(card.locator('[aria-label="Roles"]'))
  await at(when('relations', 'When someone'))
  await highlight(card.locator('[aria-label="Roles"]'), false)
  await click(page, card.getByRole('button', { name: 'End relation', exact: true }))
  const dialog = page.locator('[role=dialog]').first()
  await dialog.waitFor()
  await click(page, dialog.getByRole('button', { name: 'End relation', exact: true }), 500)   // POST /crm/relations/{id}/end
  const ended = box.locator('li[data-testid^="relation-"]', { hasText: 'Team Demo Accounting Office' }).getByText('Ended', { exact: true })
  await ended.waitFor({ timeout: 30000 })
  await scrollToEl(ended, 200, 600)
  await moveTo(page, ended, 600)
  await highlight(ended)
  await at(dur('relations') - 0.8)
  await highlight(ended, false)
})

// 5 channels: owners, refused copy -> preferred channel as a reference ------------------------------------------------------
await runScene(sess, 'channels', dur('channels'), () => visit(PERSON, async () => {
  if ((await tid(`relation-${PETROS_HEAD_REL}`).count()) !== 1) throw new Error('relation of Petros to the bakery missing')
}), async (at) => {
  const card = tid(`relation-${PETROS_HEAD_REL}`)
  const relCh = tid(`crm-channels-relation-${PETROS_HEAD_REL}`)
  const personal = section('Personal channels (valid for all relations)')
  await at(when('channels', 'The company'))
  await scrollToEl(card, 90, 800)
  await moveTo(page, relCh.locator('tbody tr').first(), 700)
  await highlight(relCh)
  await at(when('channels', 'His private'))
  await highlight(relCh, false)
  await scrollToEl(personal, 90, 800)
  await moveTo(page, personal.locator('tbody tr', { hasText: '+35790000003' }).first(), 700)
  await highlight(personal)
  await at(when('channels', 'Personal channels are'))
  await moveTo(page, personal.getByText(/Can only be contacted through an active relation/), 600)
  await at(when('channels', 'Now we'))
  await highlight(personal, false)
  await scrollToEl(card, 90, 800)
  await click(page, relCh.getByRole('button', { name: '+ Add channel', exact: true }))
  const form = relCh.locator('[data-testid="channel-add-form"]')
  await form.waitFor()
  await click(page, form.locator('input[type=text]'), 500)
  await typeText(page, 'info.bakery@pundo-e2e.io', 45)
  await click(page, form.getByRole('button', { name: 'Add channel', exact: true }), 500)   // POST …/relations/{id}/channels -> 422 channel_owned_by_org
  const hint = relCh.locator('[role=alert]', { hasText: 'already belongs to the organisation' })
  await hint.waitFor({ timeout: 30000 })
  await at(when('channels', 'The CRM'))
  await moveTo(page, hint, 600)
  await highlight(hint)
  await at(when('channels', 'and offers'))
  await click(page, hint.getByRole('button', { name: 'Choose as preferred channel of the relation', exact: true }))   // PATCH /crm/relations/{id}
  await page.waitForFunction((id) => /info\.bakery@pundo-e2e\.io \(Organisation\)/.test(document.querySelector(`#relation-${id}-preferred option:checked`)?.textContent || ''), PETROS_HEAD_REL, { timeout: 30000 })
  await at(when('channels', 'The relation now'))
  const pref = page.locator(`#relation-${PETROS_HEAD_REL}-preferred`)
  await moveTo(page, pref, 700)
  await highlight(pref)
  if (await relCh.locator('tbody tr', { hasText: 'info.bakery@pundo-e2e.io' }).count()) throw new Error('the info address was copied to the relation')
  await at(dur('channels') - 0.8)
  await highlight(pref, false)
})

// 6 rules box of the written guide -----------------------------------------------------------------------------
await runScene(sess, 'rules', dur('rules'), () => visit(HELP, async () => {
  await tid('help-rules').waitFor({ timeout: 15000 })
}), async (at) => {
  const box = tid('help-rules')
  const rule = (i) => box.locator('li').nth(i)
  await at(when('rules', 'The written'))
  await moveTo(page, box.locator('h2'), 700)
  await highlight(box)
  await at(when('rules', 'A channel'))
  await highlight(box, false)
  for (const [i, phrase] of [[0, 'A channel'], [1, 'a reference'], [2, 'and the name']]) {
    await at(when('rules', phrase))
    if (i > 0) await highlight(rule(i - 1), false)
    await moveTo(page, rule(i), 600)
    await highlight(rule(i))
  }
  await at(when('rules', 'A head'))
  await highlight(rule(2), false)
  const step = page.locator('[data-testid="help-section"] li', { hasText: 'area manager' }).first()
  await scrollToEl(step, 160, 900)
  await moveTo(page, step, 700)
  await highlight(step)
  await at(when('rules', 'The full'))
  await highlight(step, false)
  const help = page.locator('aside nav a[href="/admin/help"]').first()
  await moveTo(page, help, 900)
  await highlight(help)
  await at(dur('rules') - 0.8)
  await highlight(help, false)
})

await unhighlightAll()
await assertNothingBlocked()
const normW = (w) => w.replace(/\/relations\/\d+/, '/relations/<id>').replace(/\/persons\/\d+$/, '/persons/<id>')
const expected = ['POST /api/admin/crm/persons', 'PATCH /api/admin/crm/persons/<id>', 'POST /api/admin/crm/relations',
  'POST /api/admin/crm/relations/<id>/roles', 'POST /api/admin/crm/relations/<id>/end', 'POST /api/admin/crm/relations/<id>/channels',
  'PATCH /api/admin/crm/relations/<id>']
console.log('  CRM write requests:', writes)
if (JSON.stringify(writes.map(normW).sort()) !== JSON.stringify([...expected].sort())) throw new Error(`unexpected CRM write requests: ${JSON.stringify(writes)}`)
if (!writes.includes(`PATCH /api/admin/crm/persons/${NIKOS}`) || !writes.includes(`PATCH /api/admin/crm/relations/${PETROS_HEAD_REL}`)) throw new Error('a write went to the wrong person or relation')
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
