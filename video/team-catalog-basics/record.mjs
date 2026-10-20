// Recorder for team video 3b "Catalog basics: categories and brands" (F8960, topic catalog-basics).  Usage: node record.mjs en
// Same rules as ../team-products/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Privacy (stricter than the products video, BB 2026-10-20): real categories AND real brands are never readable.
//   - brands list: every <tbody tr> without "Team Demo" is blurred; category tree: every row (`li > div`) without "Team Demo" is blurred;
//   - the parent-category <select> on the category edit page shows a real category name: blurred; native lists are never opened.
//   All of it is an init script (MutationObserver + 25 ms sweep, before the first paint of every page load, also across client navigations).
// What is DECIDED here (test DB only): the brand "Team Demo Brand Two" is created through the form (prepare_team.py deletes it on the next run),
// ONE German name is typed into the demo category "Team Demo Category" (prepare_team.py resets the language rows). The brand edit page is only looked at
// (Save hovered, nothing saved). Deleting is never done.
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
const GERMAN_NAME = 'Team Demo Kategorie'
const NEW_BRAND = 'Team Demo Brand Two'
const NEW_BRAND_SLUG = 'team-demo-brand-two'

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
  console.log('  prepare:', out.at(-1).slice(0, 200))
  demo = JSON.parse(out.at(-1))
}
const CAT_PATH = `/admin/categories/${demo.category_id}/edit`
const BRAND_PATH = `/admin/brands/${demo.brand_id}/edit`
// the address bars of the scenes catname/brandedit show these ids (window_path in scenes.yml): fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [CAT_PATH, BRAND_PATH]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

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

// init script: blur real rows / selects before they are ever painted
await sess.ctx.addInitScript((keep) => {
  const run = () => {
    const p = location.pathname.replace(/\/$/, '')
    const blur = (el) => { if (!el.hasAttribute('data-vid-masked')) { el.style.filter = 'blur(14px)'; el.setAttribute('data-vid-masked', '1') } }
    if (p === '/admin/brands') document.querySelectorAll('tbody tr').forEach((el) => { if (!el.textContent.includes(keep)) blur(el) })
    if (p === '/admin/categories') document.querySelectorAll('ul li > div').forEach((el) => { if (!el.textContent.includes(keep)) blur(el) })
    // parent-category list of the category edit page shows a real category name (the translation table below is demo data)
    if (/^\/admin\/categories\/[^/]+\/edit$/.test(p)) document.querySelectorAll('select').forEach(blur)
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
// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of ['/admin/categories', '/admin/categories?q=Team+Demo', CAT_PATH, '/admin/brands', '/admin/brands?q=Team+Demo', '/admin/brands/new', BRAND_PATH]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}

const addNew = () => page.getByRole('link', { name: /Add new/ }).first()
const saveBtn = () => page.getByRole('button', { name: 'Save', exact: true })

// 1 tree: categories as a tree (real entries blurred), search, open the demo category ---------------------------------------
await runScene(sess, 'tree', dur('tree'), () => visit('/admin/categories', () => page.locator('ul li').first().waitFor({ timeout: 30000 })), async (at) => {
  const tree = page.locator('div.rounded-xl.border').first()
  await at(when('tree', 'They form'))
  await moveTo(page, tree, 900)
  await highlight(tree)
  await at(when('tree', 'Instead'))
  await highlight(tree, false)
  await search(MARK, async () => { if (!(await page.locator('li', { hasText: 'Team Demo Category' }).count())) throw new Error('demo category not found in the tree') })
  const entry = page.locator('li', { hasText: 'Team Demo Category' }).last()
  await at(when('tree', 'Here is'))
  await moveTo(page, entry, 800)
  await highlight(entry)
  await at(when('tree', 'Click'))
  await highlight(entry, false)
  const edit = page.locator(`a[href="${CAT_PATH}"]`).first()
  await moveTo(page, edit, 600)
  await highlight(edit)
  await at(dur('tree') - 0.9)
  await highlight(edit, false)
  await leave(edit, (u) => u.pathname === CAT_PATH)
})

// 2 catname: translation table of the demo category, type a German name, Save -------------------------------------------------
await runScene(sess, 'catname', dur('catname'), () => arrive(async () => {
  if (!(await page.locator('h1', { hasText: 'Team Demo Category' }).count())) throw new Error('category edit page does not show the demo category')
}), async (at) => {
  const table = page.locator('table').first()
  const inputs = table.locator('tbody tr input')
  if ((await inputs.count()) !== 6) throw new Error('translation table does not have 6 rows')
  const de = inputs.nth(1)                            // order: en, de, el, ru, ar, he (LANGUAGES in CategoryForm)
  if ((await table.locator('tbody tr').nth(1).locator('td').first().innerText()).trim().toLowerCase() !== 'de') throw new Error('row 2 is not DE')
  await at(lead + 0.3)
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('catname', 'To rename'))
  await highlight(table, false)
  await at(when('catname', 'Here we'))
  await click(page, de, 700)
  await typeText(page, GERMAN_NAME, 70)
  await at(when('catname', 'The name is'))
  const save = saveBtn()
  await moveTo(page, save, 700)
  await highlight(save)
  await at(when('catname', 'Only a taxonomy'))
  await highlight(save, false)
  await moveTo(page, table, 800)
  await at(dur('catname') - 1.4)
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('catname') - 0.7)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/categories')   // PUT /admin/categories/{id}/translations
})

// 3 brands: list + search, "Add new" ------------------------------------------------------------------------------------------
await runScene(sess, 'brands', dur('brands'), async () => {
  await visit('/admin/brands')
  await sleep(500)
  await sess.resume()                                    // the previous scene ended frozen (leave): picture on again, showing this page
  await sleep(500)
}, async (at) => {
  await at(when('brands', 'Open'))
  await search(MARK, () => demoRows('brands', 1))
  await at(when('brands', 'If the'))
  const row = page.locator('tbody tr', { hasText: MARK }).first()
  await moveTo(page, row, 800)
  await highlight(row)
  await at(when('brands', 'Only if'))
  await highlight(row, false)
  await moveTo(page, addNew(), 800)
  await highlight(addNew())
  await at(dur('brands') - 1.2)
  await highlight(addNew(), false)
  await leave(addNew(), (u) => u.pathname === '/admin/brands/new')
})

// 4 newbrand: name -> slug fills in by itself -> Save --------------------------------------------------------------------------
await runScene(sess, 'newbrand', dur('newbrand'), () => arrive(async () => { await field('name').waitFor(); await field('slug').waitFor() }), async (at) => {
  await at(lead + 0.2)
  await moveTo(page, field('name'), 700)
  await at(when('newbrand', 'Type the') + 0.4)
  await typeInto('name', NEW_BRAND, 70)
  if ((await field('slug').inputValue()) !== NEW_BRAND_SLUG) throw new Error(`slug was not prefilled from the name: "${await field('slug').inputValue()}"`)
  await at(when('newbrand', 'The slug'))
  await moveTo(page, field('slug'), 700)
  await highlight(field('slug'))
  await at(when('newbrand', 'Check'))
  await at(when('newbrand', 'Then'))
  await highlight(field('slug'), false)
  const save = saveBtn()
  await moveTo(page, save, 700)
  await highlight(save)
  await at(dur('newbrand') - 1.2)
  await highlight(save, false)
  await leave(save, (u) => u.pathname === '/admin/brands')       // POST /api/admin/brands with slug (B8100-001)
})

// 5 brandlist: back in the list, search, both demo brands, open the older one ------------------------------------------------
await runScene(sess, 'brandlist', dur('brandlist'), () => arrive(() => page.locator('tbody tr').first().waitFor({ timeout: 30000 })), async (at) => {
  await at(when('brandlist', 'Search'))
  await search(MARK, () => demoRows('brands after Save', 2))
  const created = page.locator('tbody tr', { hasText: NEW_BRAND })
  if (!(await created.count())) throw new Error('the new demo brand is not in the list - Save did not work')
  await moveTo(page, created.first(), 700)
  await highlight(created.first())
  await at(when('brandlist', 'To change'))
  await highlight(created.first(), false)
  const edit = page.locator(`a[href="${BRAND_PATH}"]`).first()
  await moveTo(page, edit, 700)
  await highlight(edit)
  await at(dur('brandlist') - 0.9)
  await highlight(edit, false)
  await leave(edit, (u) => u.pathname === BRAND_PATH)
})

// 6 brandedit: the form without slug, Save only hovered (nothing saved) -----------------------------------------------------------
await runScene(sess, 'brandedit', dur('brandedit'), () => arrive(async () => {
  if ((await field('name').inputValue()) !== 'Team Demo Brand') throw new Error('brand edit page does not show the demo brand')
  if (await page.locator('[name="slug"]').count()) throw new Error('edit form unexpectedly shows a slug field')
}), async (at) => {
  const form = page.locator('form').first()
  await at(lead + 0.2)
  await moveTo(page, field('name'), 700)
  await highlight(form)
  await at(when('brandedit', 'It stays'))
  await highlight(form, false)
  await at(when('brandedit', 'Changes'))
  const save = saveBtn()
  await moveTo(page, save, 800)                          // hover only: NOTHING is saved here
  await highlight(save)
  await at(when('brandedit', 'That is'))
  await highlight(save, false)
})

await unhighlightAll()
const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
