// Recorder for team video 3 "Maintaining shops" (F8960 T19).  Usage: node record.mjs en
// Same rules as ../team-claims-owners/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel
// E2E run, privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API,
// demo data from ../team-common/prepare_team.py (marker "Team Demo").
// Privacy: EVERY table row without "Team Demo" is blurred by a MutationObserver that is installed as an init script (before the
// first paint of every page load, also across client navigations) - no unblurred intermediate frame. Exception: the list of
// shop types (/admin/shop-types) is the taxonomy (no personal data) and stays readable.
// What is DECIDED here (test DB only): the shop "Team Demo Taverna" is created through the form (prepare_team.py deletes it on the
// next run), the address of "Team Demo Bakery" is edited (prepare_team.py puts it back). The hard delete is only SHOWN: the dialog
// is opened, the name is never typed, the confirm button must be disabled, then Cancel. Impersonation is never touched.
// Every scene shows ONE page (address bar of scenes.yml): page switches happen at scene borders (click, frozen picture, next scene resumes).
// Needs .cache/en/timeline.json (tts.py).
// Env: SKIP_PREPARE=1 (prepare_team.py --dry-run), BACKEND_DIR (default ~/dev/github/pundo_main_backend).
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
const NEW_NAME = 'Team Demo Taverna'

// guard FIRST (before the DB is touched by prepare_team.py): frontend :3500, backend :8500 answering /health
const BACKEND = process.env.VIDEO_BACKEND_URL || 'http://localhost:8500'
assertTestInstance({ frontend: BASE, backend: BACKEND })
await assertBackendHealthy(BACKEND)

// ---- test-DB preparation (pundo_test only; the script refuses everything else): removes the shop of the last run ----
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
const BAKERY = demo.shops.bakery.id
const EDIT_PATH = `/admin/shops/${BAKERY}/edit`
// the address bar of the scenes edit/delete shows this id (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
if (!scenesYml.includes(`admin/shops/${BAKERY}/edit"`)) throw new Error(`scenes.yml window_path does not contain admin/shops/${BAKERY}/edit - update it`)

const account = JSON.parse(fs.readFileSync(path.join(here, '../team-common/.recording-accounts.json'), 'utf8')).admin
if (!account) throw new Error('no admin account in ../team-common/.recording-accounts.json (run prepare_team.py)')

const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const dur = (id) => T.lead_in_s + A(id) + T.tail_s
const lead = T.lead_in_s

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec'), device: 'desktop', strict: true })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))
page.on('dialog', (d) => d.dismiss().catch(() => {}))   // a native confirm() would be dismissed = "no"

// init script 1: blur every <tbody tr> without the marker before it is ever painted (except the shop-type taxonomy list)
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    if (location.pathname.startsWith('/admin/shop-types')) return
    document.querySelectorAll('tbody tr').forEach((el) => {
      if (!el.textContent.includes(keep) && !el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') }
    })
  }
  // documentElement does not exist yet when the init script runs on some navigations: retry until it does (+ a 25 ms safety sweep)
  const arm = () => {
    if (!document.documentElement) return setTimeout(arm, 1)
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  }
  arm()
  setInterval(run, 25)
  document.addEventListener('DOMContentLoaded', run)
}, MARK)
const side = (href) => page.locator(`aside nav a[href="${href}"]`).first()
const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const unhighlightAll = () => page.evaluate(() => document.querySelectorAll('.vid-highlight').forEach((e) => e.classList.remove('vid-highlight'))).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
const field = (name) => page.locator(`[name="${name}"]`).first()

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
  // freeze BEFORE the real click (a fast navigation would otherwise leak 1-2 frames of the next page into this scene, found in the frame review)
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
const demoRows = async (what, min) => {
  const n = await page.locator('tbody tr', { hasText: MARK }).count()
  const all = await page.locator('tbody tr').count()
  console.log(`  ${what}: ${n} demo row(s) of ${all}`)
  if (n < min) throw new Error(`${what}: expected >= ${min} demo row(s), found ${n} - run prepare_team.py`)
}
const typeInto = async (name, text, ms = 55) => { await click(page, field(name)); await typeText(page, text, ms) }
/** Time-input of a day row (0 = from, 1 = until, 2/3 = second slot). */
const dayRow = (day) => page.locator('div.p-3.rounded-lg.border', { hasText: day }).first()
const setTime = async (day, i, value) => {
  const inp = dayRow(day).locator('input[type=time]').nth(i)
  await click(page, inp, 450)
  await inp.fill(value)
}

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/shops', '/admin/shops?q=Team+Demo', '/admin/shops/new', EDIT_PATH, '/admin/shop-types']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}
await page.locator('.leaflet-container').count()   // (the map chunk is loaded on /admin/shops/new above)

// 1 find: search first ---------------------------------------------------------------------------------------------
await runScene(sess, 'find', dur('find'), () => visit('/admin/shops'), async (at) => {
  const a = A('find')
  await at(lead + 0.22 * a)
  await search(MARK, () => demoRows('shops', 3))
  await at(lead + 0.52 * a)
  await moveTo(page, field('id'), 700)
  await highlight(field('id'))
  await at(lead + 0.62 * a)
  await highlight(field('id'), false)
  await moveTo(page, page.locator('select[name=status]').first(), 600)
  await highlight(page.locator('select[name=status]').first())
  await at(lead + 0.78 * a)
  await highlight(page.locator('select[name=status]').first(), false)
  const add = page.getByRole('link', { name: /Add new/ }).first()
  await moveTo(page, add, 800)
  await highlight(add)
  await at(lead + 0.97 * a)
  await highlight(add, false)
  await leave(add, (u) => u.pathname === '/admin/shops/new')
})

// 2 create: name, address, type ------------------------------------------------------------------------------------
await runScene(sess, 'create', dur('create'), () => arrive(async () => { await field('name').waitFor() }), async (at) => {
  const a = A('create')
  await at(lead + 0.02 * a)
  await typeInto('name', NEW_NAME)
  await at(lead + 0.20 * a)
  await moveTo(page, field('slug'), 600)
  await highlight(field('slug'))
  if ((await field('slug').inputValue()) !== 'team-demo-taverna') throw new Error('slug was not filled in from the name')
  await at(lead + 0.30 * a)
  await highlight(field('slug'), false)
  await typeInto('address', '5 Demo Street')
  await typeInto('city', 'Limassol', 70)
  await at(lead + 0.44 * a)
  await scrollToEl(field('postal_code'), 260)
  await typeInto('postal_code', '3000')
  await at(lead + 0.54 * a)
  await scrollToEl(field('shop_type_id'), 300)
  await moveTo(page, field('shop_type_id'), 700)
  await highlight(field('shop_type_id'))
  await field('shop_type_id').selectOption({ label: 'Restaurant & Bar' })
  await at(lead + 0.84 * a)
  await highlight(field('shop_type_id'), false)
  await moveTo(page, field('status'), 600)
  await highlight(field('status'))
  await at(lead + 0.98 * a)
  await highlight(field('status'), false)
})

// 3 location: search box, map, latitude / longitude ----------------------------------------------------------------
await runScene(sess, 'location', dur('location'), async () => {
  await scrollToEl(page.locator('.leaflet-container').first(), 300, 10)
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
  await sleep(600)
}, async (at) => {
  const a = A('location')
  const search = page.locator('input[placeholder="Search address…"]').first()
  await at(lead + 0.22 * a)
  await moveTo(page, search, 700)                      // not typed into: the search would call the external geocoder
  await highlight(search)
  await at(lead + 0.36 * a)
  await highlight(search, false)
  const map = page.locator('.leaflet-container').first()
  await moveTo(page, map, 900)
  await highlight(map)
  await at(lead + 0.52 * a)
  await highlight(map, false)
  const lat = page.locator('input[type=number]').nth(0), lng = page.locator('input[type=number]').nth(1)
  const mb = await map.boundingBox()
  await moveTo(page, map, 500)
  await page.mouse.move(mb.x + mb.width / 2 + 90, mb.y + mb.height / 2 + 40)
  await page.evaluate(([x, y]) => window.__vidGlide && window.__vidGlide(x, y, 500), [mb.x + mb.width / 2 + 90, mb.y + mb.height / 2 + 40])
  await sleep(550)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [mb.x + mb.width / 2 + 90, mb.y + mb.height / 2 + 40])
  await page.mouse.click(mb.x + mb.width / 2 + 90, mb.y + mb.height / 2 + 40)   // move the pin: the fields below fill in
  await at(lead + 0.62 * a)
  await click(page, lat); await lat.fill('34.6841')
  await click(page, lng); await lng.fill('33.0226')
  if ((await lat.inputValue()) !== '34.6841' || (await lng.inputValue()) !== '33.0226') throw new Error('lat/lng input did not take the typed values')
  await at(lead + 0.78 * a)
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
  await moveTo(page, map, 700)
  await highlight(map)
  await at(lead + 0.98 * a)
  await highlight(map, false)
})

// 4 hours, then Save ------------------------------------------------------------------------------------------------
await runScene(sess, 'hours', dur('hours'), () => scrollToEl(page.getByText('Opening hours', { exact: true }).first(), 90, 10), async (at) => {
  const a = A('hours')
  await at(lead + 0.14 * a)
  await moveTo(page, dayRow('Monday'), 700)
  await highlight(dayRow('Monday'))
  await at(lead + 0.26 * a)
  await highlight(dayRow('Monday'), false)
  await setTime('Monday', 0, '11:00')
  await setTime('Monday', 1, '15:00')
  await at(lead + 0.48 * a)
  await scrollToEl(page.getByText('Sunday', { exact: true }).first(), 330, 800)
  await click(page, dayRow('Sunday').locator('input[type=checkbox]'))
  if (!(await dayRow('Sunday').locator('input[type=checkbox]').isChecked())) throw new Error('Sunday is not ticked as closed')
  await at(lead + 0.66 * a)
  await scrollToEl(page.getByText('Monday', { exact: true }).first(), 200, 700)
  await click(page, dayRow('Monday').getByRole('button', { name: 'Add second slot' }))
  await setTime('Monday', 2, '18:00')
  await setTime('Monday', 3, '23:00')
  await at(lead + 0.84 * a)
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await scrollTop(-1, 900)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(lead + 0.96 * a)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/shops')
})

// 5 saved: back in the list, new shop is there, open the edit page of the demo bakery -------------------------------
await runScene(sess, 'saved', dur('saved'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const a = A('saved')
  await at(lead + 0.14 * a)
  await search(MARK, () => demoRows('shops after save', 4))
  const row = page.locator('tbody tr', { hasText: NEW_NAME }).first()
  if (!(await row.count())) throw new Error(`new shop "${NEW_NAME}" not in the list after Save`)
  await at(lead + 0.34 * a)
  await moveTo(page, row, 800)
  await highlight(row)
  await at(lead + 0.62 * a)
  await highlight(row, false)
  const edit = page.locator(`a[href="${EDIT_PATH}"]`).first()
  await moveTo(page, edit, 800)
  await at(lead + 0.97 * a)
  await leave(edit, (u) => u.pathname === EDIT_PATH)
})

// 6 edit: change the address of the demo bakery, Save --------------------------------------------------------------
await runScene(sess, 'edit', dur('edit'), () => arrive(async () => {
  if ((await field('name').inputValue()) !== 'Team Demo Bakery') throw new Error('edit page does not show the demo bakery')
}), async (at) => {
  const a = A('edit')
  await at(lead + 0.12 * a)
  await click(page, field('address'))
  await page.keyboard.press('End')
  await typeText(page, ', ground floor', 60)
  await at(lead + 0.34 * a)
  const owner = page.locator('[data-testid=shop-owner-section]').first()
  await scrollToEl(owner, 140, 900)
  await moveTo(page, owner, 700)
  await highlight(owner)
  await at(lead + 0.58 * a)
  await highlight(owner, false)
  await at(lead + 0.74 * a)
  await scrollTop(0, 900)
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await scrollToEl(save, 300, 800)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(lead + 0.93 * a)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/shops')
})

// 7 delete: only shown, never executed -----------------------------------------------------------------------------
await runScene(sess, 'delete', dur('delete'), async () => {
  await visit(EDIT_PATH, async () => { if ((await field('name').inputValue()) !== 'Team Demo Bakery') throw new Error('edit page does not show the demo bakery') })
  await scrollTop(-1, 10)
  await sleep(500)
  await sess.resume()                                    // the previous scene ended frozen (leave): picture on again, showing this page
  await sleep(500)
}, async (at) => {
  const a = A('delete')
  const zone = page.locator('section', { hasText: 'Delete shop permanently' }).last()
  const open = page.getByRole('button', { name: 'Delete shop…' })
  await at(lead + 0.06 * a)
  await moveTo(page, zone, 800)
  await highlight(zone)
  await at(lead + 0.40 * a)
  await highlight(zone, false)
  await click(page, open)
  const dlg = page.locator('[role=dialog]').first()
  await dlg.waitFor()
  await page.getByText(/\d+ offers/).waitFor({ timeout: 15000 })
  // hard safety net: the confirm button of the dialog must be disabled (name not typed) - otherwise abort, nothing is clicked
  const confirm = dlg.getByRole('button', { name: 'Delete shop' })
  if (!(await confirm.isDisabled())) throw new Error('SAFETY: delete confirm button is enabled without the name - abort')
  await at(lead + 0.52 * a)
  await moveTo(page, dlg.locator('div.bg-gray-50').first(), 800)
  await highlight(dlg.locator('div.bg-gray-50').first())
  await at(lead + 0.70 * a)
  await highlight(dlg.locator('div.bg-gray-50').first(), false)
  await click(page, dlg.getByRole('button', { name: 'Cancel' }))
  await dlg.waitFor({ state: 'detached' })
  await at(lead + 0.80 * a)
  await scrollToEl(field('status'), 300, 900)
  await moveTo(page, field('status'), 700)
  await highlight(field('status'))
  await at(lead + 0.97 * a)
  await highlight(field('status'), false)
  await leave(side('/admin/shop-types'), (u) => u.pathname === '/admin/shop-types')
})

// 8 shop types (taxonomy list, readable) ----------------------------------------------------------------------------
await runScene(sess, 'shoptypes', dur('shoptypes'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  const a = A('shoptypes')
  const table = page.locator('table').first()
  await at(lead + 0.12 * a)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(lead + 0.30 * a)
  await highlight(table, false)
  await scrollTop(520, 1400)
  await at(lead + 0.52 * a)
  await scrollTop(0, 900)
  const edit = page.locator('tbody tr', { hasText: 'Bakery' }).first().getByRole('link', { name: 'Edit' })
  await moveTo(page, edit, 800)                      // hover only, never opened
  await highlight(edit)
  await at(lead + 0.74 * a)
  await highlight(edit, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
