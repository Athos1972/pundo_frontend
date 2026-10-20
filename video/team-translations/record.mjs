// Recorder for team video 4b "How translations come about" (F8960 T21).  Usage: node record.mjs en
// Same rules as ../team-products/record.mjs: STRICT mode (only test instance frontend :3500 / backend :8500, no parallel E2E run,
// privacy check per scene: e-mail outside @pundo-e2e.io or visible password field = abort), admin login via API, demo data from
// ../team-common/prepare_team.py (marker "Team Demo").
// Picture = mix of 2 real admin pages and 4 local explainer graphics (graphics.html, file://, no network, no real data):
//   product    real: edit page of "Team Demo Sourdough Loaf" with one name/description field per language - looked at only, NOTHING is saved (Save is hovered)
//   categories real: translation table of "Team Demo Category": a German name is typed and saved (PUT translations);
//              prepare_team.py deletes every language except en + el of this one demo category at the start of the next run
//   chain / merge / marker: graphics.html?s=<id>; steps are revealed with window.__step(n) in sync with the narration
//              (word times from .cache/en/audio/<id>.json written by tts.py).
// Privacy: the admin pages shown contain only demo data (no list of real rows: no table masking needed), the native <select>
// elements are never opened. Strict privacy check before and after every scene.
// Needs .cache/en/timeline.json (tts.py).  Env: SKIP_PREPARE=1 (prepare_team.py --dry-run), BACKEND_DIR (default ~/dev/github/pundo_main_backend).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BASE, sleep, startSession, runScene, click, moveTo, typeText, adminLogin } from '../_branding/lib/record-lib.mjs'
import { assertTestInstance, assertBackendHealthy } from '../_branding/lib/guard.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing
const MARK = 'Team Demo'
const GERMAN_NAME = 'Team Demo Kategorie'

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
const EDIT_PATH = `/admin/products/${demo.item_id}/edit`
const CAT_PATH = `/admin/categories/${demo.category_id}/edit`
// the address bar of the real scenes (window_path in scenes.yml) must show the ids of this run: fail early when they differ
const scenesYml = fs.readFileSync(path.join(here, 'scenes.yml'), 'utf8')
for (const p of [EDIT_PATH, CAT_PATH]) if (!scenesYml.includes(`localhost:3500${p}"`)) throw new Error(`scenes.yml window_path does not contain ${p} - update it`)

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
page.on('dialog', (d) => d.dismiss().catch(() => {}))

const highlight = (loc, on = true) => loc.evaluate((el, on) => el.classList.toggle('vid-highlight', on), on).catch(() => {})
const settle = async () => { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(300) }
/** Smooth scroll of the scrolling ancestor of <main> so that `loc` sits `offset` px below the top edge. */
const scrollToEl = (loc, offset = 160, ms = 800) => loc.evaluate((el, [offset, ms]) => new Promise((res) => {
  let sc = document.querySelector('main')
  while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
  sc = sc || document.scrollingElement
  const from = sc.scrollTop
  const to = Math.max(0, from + el.getBoundingClientRect().top - (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top) - offset)
  const t0 = performance.now()
  const stepFn = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    sc.scrollTop = from + (to - from) * e
    k < 1 ? requestAnimationFrame(stepFn) : res()
  }
  requestAnimationFrame(stepFn)
}), [offset, ms])
const field = (name) => page.locator(`[name="${name}"]`).first()
const step = (n) => page.evaluate((n) => window.__step(n), n)
let frozen = false
const freeze = async () => { await sess.pause(); frozen = true }
const thaw = async () => { if (frozen) { await sess.resume(); frozen = false; await sleep(400) } }

/** Hidden navigation before a scene (frames before the scene start are not used). */
async function visit(p, ready) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 30000 })
  await settle()
  if (ready) await ready()
  await sleep(300)
  await thaw()
}
/** Explainer graphic: file:// page of this folder, nothing is loaded from the network. */
async function graphic(id) {
  await page.goto(`${pathToFileURL(path.join(here, 'graphics.html')).href}?s=${id}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await sleep(300)
  await thaw()
}

// ---- login (API, no login form on screen) + warm-up (Next dev compiles pages on first visit; read-only GETs, not part of any scene) ----
await adminLogin(sess, account)
for (const p of [EDIT_PATH, CAT_PATH]) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await settle()
}

// 1 chain ---------------------------------------------------------------------------------------------------------------
await runScene(sess, 'chain', dur('chain'), () => graphic('chain'), async (at) => {
  await step(0)
  await at(when('chain', 'You enter')); await step(1)
  await at(when('chain', 'Later')); await step(2)
  await at(when('chain', 'The run sends')); await step(3)
  await at(when('chain', 'A worker')); await step(4)
  await at(when('chain', 'Only the')); await step(5)
  await at(when('chain', 'Clicking')); await step(6)
})

// 2 product: real edit page with a field per language, looked at only (nothing is saved) ----------------------------------
await runScene(sess, 'product', dur('product'), () => visit(EDIT_PATH, async () => {
  if (!(await field('name_en').inputValue()).startsWith('Team Demo Sourdough Loaf')) throw new Error('edit page does not show the demo loaf')
  for (const l of ['de', 'ru', 'el', 'ar', 'he']) if (!(await field(`name_${l}`).inputValue())) throw new Error(`demo loaf has no ${l} name - run prepare_team.py`)
}), async (at) => {
  const fieldset = page.locator('form fieldset').first()
  await at(when('product', 'This is'))
  await moveTo(page, field('name_en'), 800)
  await at(when('product', 'It has'))
  await highlight(fieldset)
  await at(when('product', 'You can'))
  await highlight(fieldset, false)
  await scrollToEl(field('name_de'), 170, 800)
  await moveTo(page, field('name_de'), 600)
  await highlight(field('name_de'))
  await at(when('product', 'Clear'))
  await highlight(field('name_de'), false)
  await scrollToEl(field('name_ar'), 200, 1200)
  await moveTo(page, field('name_ar'), 600)
  await highlight(field('name_ar'))
  await at(when('product', 'Saving'))
  await highlight(field('name_ar'), false)
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await scrollToEl(save, 330, 900)
  await moveTo(page, save, 800)                       // hover only: NOTHING is saved here
  await highlight(save)
  await at(dur('product') - 0.8)
  await highlight(save, false)
})

// 3 merge: graphic ----------------------------------------------------------------------------------------------------------
await runScene(sess, 'merge', dur('merge'), () => graphic('merge'), async (at) => {
  await step(0)
  await at(when('merge', 'You typed')); await step(1)
  await at(when('merge', 'The run finds')); await step(2)
  await at(when('merge', 'and adds')); await step(3)
  await at(when('merge', 'The job never')); await step(4)
})

// 5 categories: real translation table, German name typed and saved (leave = freeze before the click, as in the other recorders) --
await runScene(sess, 'categories', dur('categories'), () => visit(CAT_PATH, async () => {
  if (!(await page.locator('h1', { hasText: 'Team Demo Category' }).count())) throw new Error('category edit page does not show the demo category')
}), async (at) => {
  const table = page.locator('table').first()
  const inputs = table.locator('tbody tr input')
  if ((await inputs.count()) !== 6) throw new Error('translation table does not have 6 rows')
  const de = inputs.nth(1)                            // order: en, de, el, ru, ar, he (LANGUAGES in CategoryForm)
  if ((await table.locator('tbody tr').nth(1).locator('td').first().innerText()).trim().toLowerCase() !== 'de') throw new Error('row 2 is not DE')
  await at(when('categories', 'Open a'))
  await moveTo(page, table, 900)
  await highlight(table)
  await at(when('categories', 'You can'))
  await highlight(table, false)
  await at(when('categories', 'Let us'))
  await click(page, de, 700)
  await typeText(page, GERMAN_NAME, 70)
  await at(when('categories', 'The name is') - 0.5)
  const save = page.getByRole('button', { name: 'Save', exact: true })
  const { x, y } = await moveTo(page, save, 700)
  await highlight(save)
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(250)
  await freeze()                                      // freeze BEFORE the click: the form then goes to the category list, which is never shown
  await page.mouse.click(x, y)                        // PUT /admin/categories/{id}/translations
  await page.waitForURL((u) => u.pathname === '/admin/categories', { timeout: 30000 })
  // hidden reload of the edit page = proof that the German name is stored; visit() resumes the picture on the reloaded form
  await visit(CAT_PATH, async () => {
    const saved = await page.locator('table tbody tr').nth(1).locator('input').inputValue()
    if (saved !== GERMAN_NAME) throw new Error(`German name not stored: "${saved}"`)
  })
  const de2 = page.locator('table tbody tr').nth(1).locator('input')
  await moveTo(page, de2, 700)
  await highlight(de2)
  await at(when('categories', 'No automatic'))
  await highlight(de2, false)
  await moveTo(page, table, 800)
  await at(when('categories', 'Only a'))
})

// 6 marker ---------------------------------------------------------------------------------------------------------------
await runScene(sess, 'marker', dur('marker'), () => graphic('marker'), async (at) => {
  await step(0)
  await at(when('marker', 'The data')); await step(1)
  await at(when('marker', 'written by')); await step(2)
  await at(when('marker', 'Everything')); await step(3)
  await at(when('marker', 'Today')); await step(4)
})

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
