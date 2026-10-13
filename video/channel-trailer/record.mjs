// Recorder for the channel trailer.  Usage: node record.mjs <lang>
// Read-only recording of the PUBLIC site (default https://pundo.cy): homepage, one search, one product page,
// for-shops, guides. No sign-in, no form submits, nothing written. Override with VIDEO_BASE_URL (e.g. the
// test instance http://localhost:3500 - but its DB has no product images, so the compare scene looks empty).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.VIDEO_BASE_URL ||= 'https://pundo.cy'
const { BASE, sleep, startSession, runScene, smoothScroll, tap, typeText } = await import('../_branding/lib/record-lib.mjs')

const lang = process.argv[2] || 'en'
const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(here, '.cache', lang)
const tl = JSON.parse(fs.readFileSync(path.join(cacheDir, 'timeline.json'), 'utf8'))
const T = tl.brand.timing                                   // includes the per-video override from scenes.yml
const demo = tl.meta.demo
const dur = (id) => T.lead_in_s + tl.scenes.find((x) => x.id === id).audio_s + T.tail_s
const A = (id) => tl.scenes.find((x) => x.id === id).audio_s
const lead = T.lead_in_s
const url = (p) => `${BASE}${p}`

const sess = await startSession({ lang, outDir: path.join(cacheDir, 'rec') })
const { page } = sess
const warn = []
page.on('pageerror', (e) => warn.push(e.message))

// warm-up (caches, fonts, images)
for (const p of [`/${lang}`, `/${lang}/products/${demo.product}`, `/${lang}/for-shops`, `/${lang}/guides`]) {
  await page.goto(url(p), { waitUntil: 'networkidle' }).catch(() => {})
}

// 1 hook: homepage, scroll to the category grid ---------------------------------
await runScene(sess, 'hook', dur('hook'),
  async () => { await page.goto(url(`/${lang}`), { waitUntil: 'networkidle' }); await sleep(800) },
  async (at) => {
    await at(lead + 0.15 * A('hook'))
    await smoothScroll(page, 1150, A('hook') * 0.75 * 1000)
  })

// 2 search: type the query into the homepage search box ---------------------------
await runScene(sess, 'search', dur('search') + 0.6,
  async () => { await page.evaluate(() => window.scrollTo(0, 0)); await sleep(400) },
  async (at) => {
    const box = page.locator('input[type=search], input[type=text]').first()
    await at(lead * 0.5)
    await tap(page, box)
    await typeText(page, demo.query, 70)
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/search/, { timeout: 15000 }).catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await sleep(600)
    await at(lead + 0.62 * A('search'))
    await smoothScroll(page, 420, 1400)    // reveal the result cards below the map
  })

// 3 compare: product page, highlight the offers card ------------------------------
await runScene(sess, 'compare', dur('compare'),
  async () => { await page.goto(url(`/${lang}/products/${demo.product}`), { waitUntil: 'networkidle' }); await sleep(800) },
  async (at) => {
    const offers = page.locator('main h2').first().locator('xpath=../..')   // the "All offers" card
    await at(lead + 0.2 * A('compare'))
    await smoothScroll(page, 120, 700)
    await offers.evaluate((el) => el.classList.add('vid-highlight')).catch(() => {})
    await at(lead + 0.95 * A('compare'))
    await offers.evaluate((el) => el.classList.remove('vid-highlight')).catch(() => {})
  })

// 4 shops: for-shops landing ------------------------------------------------------
await runScene(sess, 'shops', dur('shops'),
  async () => { await page.goto(url(`/${lang}/for-shops`), { waitUntil: 'networkidle' }); await sleep(800) },
  async (at) => {
    await at(lead + 0.45 * A('shops'))
    await smoothScroll(page, 500, A('shops') * 0.5 * 1000)
  })

// 5 subscribe: guides overview -----------------------------------------------------
await runScene(sess, 'subscribe', dur('subscribe'),
  async () => { await page.goto(url(`/${lang}/guides`), { waitUntil: 'networkidle' }); await sleep(800) },
  async (at) => {
    await at(lead + 0.1 * A('subscribe'))
    await smoothScroll(page, 900, A('subscribe') * 0.85 * 1000)
  })

const n = await sess.finish()
console.log(`frames: ${n}; page errors: ${warn.length}`, warn.slice(0, 3))
