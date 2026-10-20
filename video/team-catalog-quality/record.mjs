// Recorder for team video 7 "Catalog quality: attributes and service mappings" (F8960, topic catalog-quality).  Usage: node record.mjs en
// Same rules as ../team-moderation/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy (BB 2026-10-20): real categories, real mappings (hundreds of rows) and the gap list are never readable.
//   - /admin/category-attribute-definitions (category list): every <tbody tr> without "Team Demo" is blurred;
//   - /admin/item-domain-mappings: every <tbody tr> is blurred except the demo mapping (item cell ends with "#<id of Team Demo Service>");
//   - /admin/item-domain-mappings/gaps: EVERY <tbody tr> is blurred.
//   All of it is an init script (MutationObserver + 25 ms sweep, before the first paint of every page load, also across client navigations).
// What is DECIDED here (test DB only): ONE attribute definition (key team_demo_size) is created on the demo category and ONE mapping of the demo service
// "Team Demo Service" to a profession, with Auto-assign OFF (so no onboarding of a real shop can pick the demo service up). prepare_team.py deletes both again
// at the start of the next run. Nothing is edited or deleted by the video: "Delete" is only hovered, the confirm dialogs are never opened.
// Every scene shows ONE page (address bar of scenes.yml): page switches happen at scene borders (click, frozen picture, next scene resumes).
// Narration anchors: when(sceneId, "first words of a sentence") reads the word times of .cache/en/audio/<id>.json (tts.py).
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
const DEF_KEY = 'team_demo_size'
const DEF_LABEL = 'Team Demo Size'
const DEF_OPTIONS = 'Small, Medium, Large'
const DOMAIN_ID = '1'            // an existing profession (onboarding domain); the mapping has Auto-assign OFF and is deleted again by prepare_team.py
const PAGE_SIZE = 50             // MappingList page size (item-domain-mappings/page.tsx LIMIT)

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else) ----
let demo
{
  const backend = process.env.BACKEND_DIR || path.join(os.homedir(), 'dev/github/pundo_main_backend')
  const args = [path.join(here, '../team-common/prepare_team.py')]
  if (process.env.SKIP_PREPARE === '1') args.push('--dry-run')
  const out = execFileSync(path.join(backend, '.venv/bin/python'), args, { cwd: backend, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString().trim().split('\n')
  console.log('  prepare:', out.at(-1).slice(0, 120))
  demo = JSON.parse(out.at(-1))
}
const CAT_ID = demo.category_id
const SERVICE_ID = demo.service_item_id
const DEFS_PATH = `/admin/category-attribute-definitions/${CAT_ID}`
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [DEFS_PATH, `${DEFS_PATH}/new`]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

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
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm()/alert() would be dismissed

// init script: blur real rows before they are ever painted
await sess.ctx.addInitScript(([keep, svc]) => {
  const run = () => {
    const p = location.pathname.replace(/\/$/, '')
    const blur = (el) => { if (!el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') } }
    if (p === '/admin/category-attribute-definitions') document.querySelectorAll('tbody tr').forEach((el) => { if (!el.textContent.includes(keep)) blur(el) })
    if (p === '/admin/item-domain-mappings') {
      document.querySelectorAll('tbody tr').forEach((el) => {
        if (el.querySelector('td[colspan]')) return                       // empty-state row
        const itemCell = (el.children[1]?.textContent || '').trim()       // "<name or —>#<item id>"
        if (!itemCell.endsWith('#' + svc)) blur(el)
      })
    }
    if (p === '/admin/item-domain-mappings/gaps') document.querySelectorAll('tbody tr').forEach(blur)
  }
  const arm = () => {
    if (!document.documentElement) return setTimeout(arm, 1)
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  }
  arm()
  setInterval(run, 25)
  document.addEventListener('DOMContentLoaded', run)
}, [MARK, String(SERVICE_ID)])

const side = (href) => page.locator(`aside nav a[href="${href}"]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
const demoRow = () => page.locator('tbody tr', { hasText: MARK }).first()
const defRow = () => page.locator('tbody tr', { hasText: DEF_KEY }).first()
const mapRow = () => page.locator('tbody tr').filter({ has: page.locator('td:nth-child(2)', { hasText: new RegExp(`#${SERVICE_ID}\\s*$`) }) }).first()

/** Smooth scroll of the scrolling ancestor of <main> so that `loc` sits `offset` px below the top edge. */
const scrollToEl = (loc, offset = 160, ms = 800) => loc.evaluate((el, [offset, ms]) => new Promise((res) => {
  let sc = document.querySelector('main')
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
  sc = sc || document.scrollingElement
  const from = sc.scrollTop
  const to = Math.max(0, from + el.getBoundingClientRect().top - (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top) - offset)
  const t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [offset, ms])
const scrollTop = (y, ms = 600) => page.evaluate(([y, ms]) => new Promise((res) => {
  let sc = document.querySelector('main')
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
  sc = sc || document.scrollingElement
  const from = sc.scrollTop, to = y < 0 ? sc.scrollHeight : y, t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(step) : res()
  }
  requestAnimationFrame(step)
}), [y, ms])

/** Click, freeze the picture and wait for the target page; the NEXT scene resumes (arrive) - so this scene never shows the new page. */
async function leave(loc, urlTest) {
  // freeze BEFORE the real click (a fast navigation would otherwise leak 1-2 frames of the next page into this scene)
  const { x, y } = await moveTo(page, loc, 600)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(260)                       // ripple is visible in the frozen frame
  await sess.pause()
  await page.mouse.click(x, y)
  await page.waitForURL(urlTest, { timeout: 30000 })
}
/** First action of a scene that follows a leave(): wait until the page is ready, then resume the picture. */
async function arrive(ready) {
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sleep(300)
  await sess.resume()
  await sleep(400)
}
/** Hidden navigation before a scene (frames before the scene start are not used). */
async function visit(p, ready) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sleep(300)
}
/** Type into the list search field and submit (GET form -> full page load, hidden by the freeze). */
async function search(term, ready) {
  const input = page.locator('input[name="q"]').first()
  await click(page, input)
  await typeText(page, term, 70)
  await sleep(250)
  await sess.pause()
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.searchParams.has('q'), { timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sess.resume()
  await sleep(300)
}

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/dashboard', '/admin/category-attribute-definitions', '/admin/category-attribute-definitions?q=Team+Demo', DEFS_PATH, `${DEFS_PATH}/new`,
  '/admin/item-domain-mappings', '/admin/item-domain-mappings/new', '/admin/item-domain-mappings/gaps']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}
// initial state: no demo definition, no demo mapping (prepare_team.py removed them); the last list page of the mappings AFTER the creation
const before = await (await sess.ctx.request.get(`${BACKEND}/api/v1/admin/item-domain-mappings?limit=1`)).json()
if (typeof before.total !== 'number') throw new Error('cannot read the mapping total from the test backend')
const withDemo = (await (await sess.ctx.request.get(`${BACKEND}/api/v1/admin/item-domain-mappings?limit=100&offset=0`)).json()).items
if (withDemo.some((m) => m.item_id === SERVICE_ID)) throw new Error('demo mapping already exists - run prepare_team.py')
const LAST_PAGE = Math.ceil((before.total + 1) / PAGE_SIZE)
const MAPS_PATH = `/admin/item-domain-mappings?page=${LAST_PAGE}`
if (!scenesYml.includes(`localhost:3500${MAPS_PATH}"`)) throw new Error(`scenes.yml window_path of mapresult does not contain ${MAPS_PATH} (list has ${before.total} mappings) - update it`)
const defsBefore = await (await sess.ctx.request.get(`${BACKEND}/api/v1/admin/categories/${CAT_ID}/attribute-definitions`)).json()
if (defsBefore.length) throw new Error(`demo category already has ${defsBefore.length} attribute definition(s) - run prepare_team.py`)
console.log(`  mappings before: ${before.total}, last page after the creation: ${LAST_PAGE}`)

// 1 dash: two tools; the tile "Attribute Defs", the sidebar entry "Service Catalog" -------------------------------------------------------
await runScene(sess, 'dash', dur('dash'), () => visit('/admin/dashboard'), async (at) => {
  const tile = page.locator('a[href="/admin/category-attribute-definitions"]').first()
  const svc = side('/admin/item-domain-mappings')
  await at(lead + 0.2)
  await at(when('dash', 'Attribute'))
  await moveTo(page, tile, 800)
  await highlight(tile)
  await at(when('dash', 'Service'))
  await highlight(tile, false)
  await moveTo(page, svc, 800)
  await highlight(svc)
  await at(when('dash', 'Both'))
  await highlight(svc, false)
  await at(when('dash', 'Start'))
  await moveTo(page, tile, 800)
  await highlight(tile)
  await at(dur('dash') - 1.0)
  await highlight(tile, false)
  await leave(tile, (u) => u.pathname === '/admin/category-attribute-definitions')
})

// 2 cats: category list (all real rows blurred), search the demo category, "Manage defs" -------------------------------------------------
await runScene(sess, 'cats', dur('cats'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const table = page.locator('table').first()
  await at(lead + 0.2)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('cats', 'The'))
  await highlight(table, false)
  await search(MARK, async () => { await demoRow().waitFor({ timeout: 30000 }) })
  const manage = demoRow().getByRole('link', { name: 'Manage defs', exact: true })
  await at(when('cats', 'click') - 0.3)
  await moveTo(page, manage, 700)
  await highlight(manage)
  await at(dur('cats') - 0.9)
  await highlight(manage, false)
  await leave(manage, (u) => u.pathname === DEFS_PATH)
})

// 3 defs: definitions of the demo category (none yet); criteria; "Add new" ------------------------------------------------------------------
await runScene(sess, 'defs', dur('defs'), () => arrive(), async (at) => {
  const h1 = page.locator('h1').first()
  const add = page.locator(`a[href="${DEFS_PATH}/new"]`).first()
  await at(lead + 0.2)
  await moveTo(page, h1, 800)
  await highlight(h1)
  await at(when('defs', 'Before'))
  await highlight(h1, false)
  await at(when('defs', 'Otherwise'))
  await moveTo(page, add, 800)
  await highlight(add)
  await at(dur('defs') - 0.9)
  await highlight(add, false)
  await leave(add, (u) => u.pathname === `${DEFS_PATH}/new`)
})

// 4 newdef: key, label, type "select", options; "Save" ---------------------------------------------------------------------------------------
await runScene(sess, 'newdef', dur('newdef'), () => arrive(async () => { await page.locator('main form input[type=text]').first().waitFor() }), async (at) => {
  const inputs = page.locator('main form input[type=text]')
  const typeSel = page.locator('main form select').first()
  const submit = page.locator('main form button[type=submit]').first()
  await at(lead + 0.2)
  await click(page, inputs.nth(0))
  await typeText(page, DEF_KEY, 55)
  await sleep(250)
  await click(page, inputs.nth(1))
  await typeText(page, DEF_LABEL, 45)
  await at(when('newdef', 'For'))
  await moveTo(page, typeSel, 700)
  await highlight(typeSel)
  await sleep(400)
  await typeSel.selectOption('select')
  await highlight(typeSel, false)
  const options = page.locator('main form input[type=text]').nth(2)
  await options.waitFor({ timeout: 10000 })
  await click(page, options)
  await typeText(page, DEF_OPTIONS, 40)
  await at(when('newdef', 'Then'))
  await moveTo(page, submit, 700)
  await highlight(submit)
  await at(dur('newdef') - 1.0)
  await highlight(submit, false)
  await leave(submit, (u) => u.pathname === DEFS_PATH)       // POST /api/admin/category-attribute-definitions
})

// 5 defresult: the new definition in the list; "Delete" only hovered; then the sidebar entry "Service Catalog" ---------------------------
await runScene(sess, 'defresult', dur('defresult'), () => arrive(async () => {
  await defRow().waitFor({ timeout: 30000 })
  const txt = await defRow().innerText()
  if (!txt.includes(DEF_LABEL) || !txt.includes('select')) throw new Error(`definition row does not show label + type: ${txt}`)
}), async (at) => {
  const del = defRow().getByRole('button', { name: 'Delete', exact: true })
  const svc = side('/admin/item-domain-mappings')
  await at(lead + 0.2)
  await moveTo(page, defRow(), 800)
  await highlight(defRow())
  await at(when('defresult', 'Be'))
  await highlight(defRow(), false)
  await at(when('defresult', 'Deleting'))
  await moveTo(page, del, 700)                          // hover only: NOTHING is deleted by the video
  await highlight(del)
  await at(when('defresult', 'Ask'))
  await highlight(del, false)
  await at(when('defresult', 'Next'))
  await moveTo(page, svc, 800)
  await highlight(svc)
  await at(dur('defresult') - 1.0)
  await highlight(svc, false)
  await leave(svc, (u) => u.pathname === '/admin/item-domain-mappings')
})

// 6 maps: list of mappings (every real row blurred); "Add mapping" ----------------------------------------------------------------------
await runScene(sess, 'maps', dur('maps'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const table = page.locator('table').first()
  const add = page.locator('a[href="/admin/item-domain-mappings/new"]').first()
  await at(lead + 0.2)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('maps', 'When'))
  await highlight(table, false)
  await at(when('maps', 'Click'))
  await moveTo(page, add, 800)
  await highlight(add)
  await at(dur('maps') - 0.9)
  await highlight(add, false)
  await leave(add, (u) => u.pathname === '/admin/item-domain-mappings/new')
})

// 7 newmap: item ID of the demo service, profession ID, Auto-assign OFF, "Save" --------------------------------------------------------------
await runScene(sess, 'newmap', dur('newmap'), () => arrive(async () => { await page.locator('#idm-item-id').waitFor() }), async (at) => {
  const item = page.locator('#idm-item-id'), domain = page.locator('#idm-domain-id'), auto = page.locator('#idm-auto-assign')
  const submit = page.locator('main form button[type=submit]').first()
  await at(lead + 0.2)
  await click(page, item)
  await typeText(page, String(SERVICE_ID), 90)
  await sleep(300)
  await click(page, domain)
  await typeText(page, DOMAIN_ID, 90)
  await at(when('newmap', 'For'))
  await moveTo(page, auto, 700)
  await highlight(auto)
  await sleep(500)
  await auto.selectOption('false')
  await at(when('newmap', 'The'))
  await highlight(auto, false)
  await at(when('newmap', 'Click'))
  await moveTo(page, submit, 700)
  await highlight(submit)
  await at(dur('newmap') - 1.0)
  await highlight(submit, false)
  await leave(submit, (u) => u.pathname === '/admin/item-domain-mappings' && !u.search)       // POST /api/admin/item-domain-mappings
})

// 8 mapresult: last page of the list, the demo mapping at the end (Auto-assign off); "Delete" only hovered; then "Mapping Gaps" ----------------------
await runScene(sess, 'mapresult', dur('mapresult'), async () => {
  await visit(MAPS_PATH, async () => {
    await mapRow().waitFor({ timeout: 30000 })
    const cells = await mapRow().locator('td').allInnerTexts()
    if (!cells.some((c) => c.trim() === '–' || c.trim() === '-')) throw new Error(`demo mapping should show Auto-assign off: ${cells.join(' | ')}`)
    if (cells.some((c) => c.trim() === '✓')) throw new Error('demo mapping shows Auto-assign ON - refusing to continue')
  })
  await sess.resume()
  await sleep(400)
}, async (at) => {
  const del = mapRow().getByRole('button', { name: 'Delete', exact: true })
  const gaps = page.locator('a[href="/admin/item-domain-mappings/gaps"]').first()
  await at(lead + 0.2)
  await scrollToEl(mapRow(), 300, 700)
  await moveTo(page, mapRow(), 800)
  await highlight(mapRow())
  await at(when('mapresult', 'Changes'))
  await highlight(mapRow(), false)
  await at(when('mapresult', 'Shops'))
  await moveTo(page, del, 700)                          // hover only: NOTHING is deleted by the video
  await highlight(del)
  await at(when('mapresult', 'This'))
  await highlight(del, false)
  await at(when('mapresult', 'Last'))
  await scrollTop(0, 600)
  await moveTo(page, gaps, 800)
  await highlight(gaps)
  await at(dur('mapresult') - 1.0)
  await highlight(gaps, false)
  await leave(gaps, (u) => u.pathname === '/admin/item-domain-mappings/gaps')
})

// 9 gaps: the gap list, every row blurred -------------------------------------------------------------------------------------------------------
await runScene(sess, 'gaps', dur('gaps'), () => arrive(async () => {
  const rows = await page.locator('tbody tr').count()
  const blurred = await page.locator('tbody tr[data-vid-masked]').count()
  console.log(`  gap list: ${rows} rows, ${blurred} blurred`)
  if (rows !== blurred) throw new Error('gap list: not every row is blurred')
}), async (at) => {
  const table = page.locator('table').first()
  await at(lead + 0.2)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('gaps', 'New'))
  await highlight(table, false)
  await at(when('gaps', 'That'))
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
