// Generic screencast recorder (Playwright + CDP). Used by video/<slug>/record.mjs.
// Records the page as timestamped JPEG frames (sharp, deviceScaleFactor 3) instead of Playwright's
// low-bitrate video; compose.py turns the frames into a constant-fps clip per scene.
import { chromium } from '../../../node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3500'
if (/:(3000|8000)\b/.test(BASE)) throw new Error('Port 3000/8000 is production - tests/recordings only on 3500/8500')

// Injected into every page: hides Next dev UI, shows a tap ripple, provides highlight helper.
const INIT = `
(() => {
  const css = document.createElement('style');
  css.textContent = \`
    [role=tooltip], nextjs-portal, #__next-build-watcher, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display:none !important }
    .vid-ripple { position:fixed; z-index:2147483647; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%;
      background:rgba(212,98,42,.35); border:3px solid rgba(212,98,42,.9); pointer-events:none;
      animation:vidRipple .75s ease-out forwards }
    @keyframes vidRipple { 0%{transform:scale(.35);opacity:1} 100%{transform:scale(1.5);opacity:0} }
    .vid-highlight { outline:5px solid #D4622A !important; outline-offset:5px; border-radius:14px;
      animation:vidPulse 1.3s ease-in-out infinite }
    @keyframes vidPulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,98,42,.55)} 50%{box-shadow:0 0 0 18px rgba(212,98,42,0)} }
    html { scroll-behavior:auto !important }
  \`;
  const add = () => document.head && document.head.appendChild(css);
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  window.__vidRipple = (x, y) => { const d = document.createElement('div'); d.className = 'vid-ripple';
    d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900) };
})();
`

export async function startSession({ lang, outDir, viewport = { width: 390, height: 844 }, dsf = 3 }) {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, locale: lang, bypassCSP: true,
    geolocation: { latitude: 34.6841, longitude: 33.0379 }, permissions: ['geolocation'],
  })
  const consent = encodeURIComponent(JSON.stringify({ v: 1, necessary: true, statistics: false, marketing: false }))
  await ctx.addCookies([
    { name: 'app_lang', value: lang, url: BASE },
    { name: 'app_cookie_consent', value: consent, url: BASE },
  ])
  await ctx.addInitScript(INIT)
  // The app's Carto "voyager" raster tiles currently answer with an "API KEY REQUIRED" watermark tile
  // -> serve plain OpenStreetMap tiles for the recording so the map looks right.
  await ctx.route(/basemaps\.cartocdn\.com\/.*\/(\d+)\/(\d+)\/(\d+)(@2x)?\.png/, async (route) => {
    const m = route.request().url().match(/\/(\d+)\/(\d+)\/(\d+)(@2x)?\.png/)
    try {
      const resp = await route.fetch({ url: `https://tile.openstreetmap.org/${m[1]}/${m[2]}/${m[3]}.png`,
        headers: { 'user-agent': 'pundo-video-pipeline/1.0 (local screen recording)' } })
      await route.fulfill({ response: resp })
    } catch { await route.continue() }
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  let n = 0
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `frames/f${String(n++).padStart(6, '0')}.jpg`
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'))
    frames.push({ ts: metadata.timestamp, file })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  const castOpts = { format: 'jpeg', quality: 92, maxWidth: viewport.width * dsf, maxHeight: viewport.height * dsf, everyNthFrame: 1 }
  await cdp.send('Page.startScreencast', castOpts)
  const scenes = []
  return {
    page, ctx, browser,
    scenes,
    nowS: () => Date.now() / 1000,
    /** Freeze the picture (compose.py holds the last frame) e.g. while a page loads; resume() cuts to the new state. */
    pause: () => cdp.send('Page.stopScreencast').catch(() => {}),
    resume: () => cdp.send('Page.startScreencast', castOpts).catch(() => {}),
    async finish() {
      await sleep(500)
      await cdp.send('Page.stopScreencast').catch(() => {})
      fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ frames, scenes, viewport, dsf }, null, 1))
      await browser.close()
      return frames.length
    },
  }
}

/** Run one scene: `prep` untimed (navigation etc.), then `actions(at)` on a timeline of `dur` seconds. */
export async function runScene(sess, id, dur, prep, actions) {
  if (prep) await prep()
  await sleep(250) // let frames settle so the scene starts on a clean frame
  const t0 = Date.now()
  const at = async (sec) => { const w = t0 + sec * 1000 - Date.now(); if (w > 0) await sleep(w) }
  const start = t0 / 1000
  if (actions) await actions(at)
  await at(dur)
  const actual = (Date.now() - t0) / 1000
  sess.scenes.push({ id, start, dur: actual, planned: dur })
  console.log(`  scene ${id}: planned ${dur.toFixed(1)}s actual ${actual.toFixed(1)}s`)
}

export async function smoothScroll(page, to, ms) {
  await page.evaluate(([to, ms]) => new Promise((res) => {
    const from = window.scrollY, t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      window.scrollTo(0, from + (to - from) * e)
      k < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  }), [to, ms])
}

/** Tap an element (touch) with visible ripple. */
export async function tap(page, locator) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator
  await el.scrollIntoViewIfNeeded()
  const b = await el.boundingBox()
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.evaluate(([x, y]) => window.__vidRipple && window.__vidRipple(x, y), [x, y])
  await sleep(120)
  await page.touchscreen.tap(x, y)
}

export async function typeText(page, text, perChar = 85) {
  await page.keyboard.type(text, { delay: perChar })
}
