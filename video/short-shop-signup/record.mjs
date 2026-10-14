// Recorder for the YouTube Short S1 (9:16) "Your shop on pundo: free, in 5 minutes".  Usage: node record.mjs <lang>
// Derived from ../shop-signup/record.mjs; steps 5 + 6 (name/photo, login) run untimed in the prep of the last scene.
// Registers a throwaway account in pundo_test; login saved to ./.recording-accounts.json (NOT the shop-signup file).
// Needs the TEST frontend on :3500 (+ test backend :8500) and .cache/<lang>/timeline.json (from tts.py).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BASE, sleep, startSession, runScene, smoothScroll, tap, typeText } from '../_branding/lib/record-lib.mjs'

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const brand = (await import('node:child_process')).execFileSync(
  path.join(here, '../.venv/bin/python'), ['-c', 'import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path.join(here, '../_branding/brand.yml')]).toString()
const T = tl.brand.timing   // includes formats.vertical + meta.timing (brand.yml alone would miss them)
const meta = tl.meta
const coverPath = path.resolve(here, process.env.COVER_PHOTO || '../shop-signup/assets/cover.jpg')

// ---- per-language demo data & UI labels (match the live UI strings) ----
const L = {
  en: { retailer: 'Retailer', domain: /Bakery/i, domain2: /Grocery/i, next: 'Next', specialties: /./, address: 'Limassol Marina', name: "Anna's Bakery", cta: /Register free/i },
  el: { retailer: 'Έμπορος', domain: /Αρτοζαχαρ/i, domain2: /Τρόφιμα/, next: 'Επόμενο', specialties: /./, address: 'Μαρίνα Λεμεσού', name: 'Ο Φούρνος της Άννας', cta: /Δωρεάν εγγραφή/i },
}[lang]
const WHATSAPP = '+357 99 000 000', PHONE = '+357 25 000 000'   // obviously fictional
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const account = { email: `video-short-${lang}-${stamp}@pundo-e2e.io`, password: `Demo-Pass-${stamp.slice(-6)}!x`, created: new Date().toISOString() }
const accFile = path.join(here, '.recording-accounts.json')
const accounts = fs.existsSync(accFile) ? JSON.parse(fs.readFileSync(accFile, 'utf8')) : {}
accounts[lang] = account
fs.writeFileSync(accFile, JSON.stringify(accounts, null, 2))

const dur = (id) => {
  const s = tl.scenes.find((x) => x.id === id)
  return T.lead_in_s + s.audio_s + T.tail_s
}
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))

// --- warm-up: compile routes in the dev server so no scene waits on first-compile ---
for (const p of [`/${lang}`, `/${lang}/for-shops`, '/shop-admin/onboarding', '/shop-admin/register/check-email']) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}
await page.evaluate(() => localStorage.clear())
const btn = (name) => page.getByRole('button', { name, exact: typeof name === 'string' })
const nextBtn = () => btn(L.next).last()
const next = async () => { await tap(page, nextBtn()) }

// 3 step 1 -------------------------------------------------------------
await runScene(sess, 'step1-type', dur('step1-type'),
  async () => {
    await page.goto(url('/shop-admin/onboarding'), { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('h2', { timeout: 20000 }); await sleep(500)
  },
  async (at) => {
    await at(lead + 0.75 * A('step1-type'))
    await tap(page, page.getByRole('button', { name: L.retailer }).first())
  })

// 4 step 2 -------------------------------------------------------------
await runScene(sess, 'step2-offer', dur('step2-offer') + 1.0,   // +1 s: the location step lazy-loads Leaflet
  async () => { await page.getByRole('button', { name: L.domain }).first().waitFor({ timeout: 20000 }); await sleep(500) },
  async (at) => {
    await at(lead + 0.45 * A('step2-offer'))
    await tap(page, page.getByRole('button', { name: L.domain }).first())
    // NB: retailer domains have no specialties in the catalog -> no extra "Specialties" screen (documented in README)
    await at(lead + A('step2-offer') + 0.1)
    await next()
  })

// 5 step 3 -------------------------------------------------------------
await runScene(sess, 'step3-location', dur('step3-location'),
  async () => { await page.locator('.leaflet-container').waitFor({ timeout: 25000 }); await sleep(1500) },
  async (at) => {
    const a = A('step3-location')
    await at(lead + 0.12 * a)
    const input = page.locator('input[type=text]').first()
    await tap(page, input)
    await typeText(page, L.address, 110)
    const sug = page.locator('ul button').first()
    await sug.waitFor({ timeout: 8000 }).catch(() => {})
    await at(lead + 0.42 * a)
    if (await sug.count()) await tap(page, sug)
    else { const m = page.locator('.leaflet-container'); const b = await m.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2) }
    await sleep(800)
    await at(lead + a + 0.1)
    await next()
  })

// 6 step 4 -------------------------------------------------------------
await runScene(sess, 'step4-contact', dur('step4-contact'),
  async () => { await page.locator('input[type=tel]').first().waitFor({ timeout: 20000 }); await page.evaluate(() => window.scrollTo(0, 0)); await sleep(500) },
  async (at) => {
    const a = A('step4-contact')
    await at(lead + 0.12 * a)
    const tels = page.locator('input[type=tel]')
    await tap(page, tels.nth(0)); await typeText(page, WHATSAPP, 90)
    await at(lead + 0.34 * a)
    await tap(page, tels.nth(1)); await typeText(page, PHONE, 90)
    await at(lead + a + 0.1)
    await next()
  })

// 9 confirm ------------------------------------------------------------
await runScene(sess, 'confirm', dur('confirm'),
  async () => {
    // step 5: shop name + cover photo, step 6: email + password -> submit (all untimed, not in the video)
    await page.locator('#shop-name').waitFor({ timeout: 20000 })
    await page.locator('#shop-name').fill(L.name)
    await page.locator('input[type=file]').setInputFiles(coverPath); await sleep(900)
    await nextBtn().click()
    await page.locator('input[name=email]').waitFor({ timeout: 20000 })
    await page.locator('input[name=email]').fill(account.email)
    await page.locator('input[name=password]').fill(account.password)
    await page.locator('button[type=submit]').click()
    const ok = await page.waitForURL(/check-email/, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!ok) {
      console.log('  !! submit did not reach check-email (url:', page.url(), ') -> navigating directly')
      const err = await page.locator('[role=alert]').allInnerTexts().catch(() => [])
      console.log('  !! alerts:', err.join(' | '))
      await page.goto(url('/shop-admin/register/check-email'), { waitUntil: 'networkidle' })
    }
    await sleep(900)
  }, null)

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
