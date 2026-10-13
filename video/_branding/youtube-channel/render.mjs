// YouTube channel art for @pundocy (Playwright/Chromium -> PNG).
//   node video/_branding/youtube-channel/render.mjs
// Writes out/banner.png (2560x1440), out/banner-preview.png (safe-area overlay, QA only),
// out/avatar.png (800x800), out/watermark.png (150x150, transparent).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../../node_modules/playwright/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const branding = path.resolve(here, '..')
const repo = path.resolve(branding, '../..')
const outDir = path.join(here, 'out'); fs.mkdirSync(outDir, { recursive: true })

const C = {
  accent: '#D4622A', accent_light: '#FAE8DF', bg: '#F7F5F2', text: '#1A1714', text_muted: '#7A736B', green: '#2BBD6D',
}
const b64 = (p) => fs.readFileSync(p).toString('base64')
const font = (fam, f, w) => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64(path.join(branding, 'fonts', f))}) format('woff2');font-weight:${w};font-display:block}`
const CSS = `${font('Space Grotesk', 'SpaceGrotesk-latin.woff2', '300 700')}${font('DM Sans', 'DMSans-latin.woff2', '100 900')}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;color:${C.text};-webkit-font-smoothing:antialiased;overflow:hidden}
.h{font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:-0.02em}`
const logo = fs.readFileSync(path.join(branding, 'assets', 'logo.svg'), 'utf8')
const logoSvg = (w) => logo.replace(/width="\d+" height="\d+"/, `width="${w}" height="${Math.round(w * 324 / 804)}"`)
const photo = (n) => `data:image/jpeg;base64,${b64(path.join(repo, 'public', 'seed-visuals', `${n}.jpg`))}`
const html = (w, h, body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}html,body{width:${w}px;height:${h}px}${css}</style></head><body>${body}</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
const shot = async (w, h, body, file, opts = {}) => {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(html(w, h, body, opts.css))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, file), omitBackground: !!opts.transparent })
  console.log('wrote', file)
}

// ---------- pin mark: the left part of logo.svg (pin icon without wordmark) ----------
// logo.svg viewBox is "111 215 804 324"; the pin occupies roughly x 126..277, y 250..507 (the 'p' stem starts at ~305).
const pinSvg = (size) => logo
  .replace(/viewBox="[^"]+"/, 'viewBox="121 245 170 268"')
  .replace(/width="\d+" height="\d+"/, `width="${Math.round(size * 170 / 268)}" height="${size}"`)

// ---------- banner 2560x1440, safe area 1546x423 centred (x 507..2053, y 508..931) ----------
const W = 2560, H = 1440
const tiles = [
  // [photo, x, y, size, rotate, label]  — placed outside the 1546px safe width (desktop/TV only)
  ['frisches-brot', 40, 500, 200, -5, 'Bakery'],
  ['haarschnitt', 275, 525, 190, 4, 'Barber'],
  ['klimaanlage-reparatur', 120, 718, 180, 3, 'A/C repair'],
  ['kaffee-espresso', 2320, 500, 200, 5, 'Coffee'],
  ['blumenstausse', 2095, 525, 190, -4, 'Florist'],
  ['laptops-computer', 2260, 718, 180, -3, 'Electronics'],
]
const tileHtml = tiles.map(([p, x, y, s, r, l]) => `
  <div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;transform:rotate(${r}deg);background:#fff;padding:10px 10px 0;border-radius:18px;box-shadow:0 18px 40px rgba(26,23,20,.18)">
    <img src="${photo(p)}" style="width:100%;height:${s - 20}px;object-fit:cover;border-radius:10px;display:block">
    <div style="font-size:22px;font-weight:600;padding:8px 4px 10px;color:${C.text}">${l}</div></div>`).join('')
const chips = ['Products', 'Services', 'Prices', 'Shops near you']
const banner = `
  <div style="position:absolute;inset:0;background:
    radial-gradient(1100px 700px at 82% 18%, ${C.accent_light} 0%, transparent 62%),
    radial-gradient(1000px 700px at 12% 90%, #E3F5EA 0%, transparent 62%), ${C.bg}"></div>
  <svg style="position:absolute;inset:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <path d="M 340 980 C 760 1120, 1000 330, 1500 470 S 2140 980, 2300 420" fill="none" stroke="${C.accent}" stroke-opacity=".28" stroke-width="5" stroke-dasharray="4 18" stroke-linecap="round"/>
  </svg>
  ${tileHtml}
  <div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;gap:70px;padding:0 40px">
    <div style="flex:none">${logoSvg(560)}</div>
    <div style="flex:1">
      <div class="h" style="font-size:78px;line-height:1.02">Find it nearby.<br><span style="color:${C.accent}">Anywhere in Cyprus.</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:30px">
        ${chips.map((c) => `<span style="font-size:28px;font-weight:600;padding:10px 24px;border-radius:999px;background:#fff;border:2px solid #E5E0D9">${c}</span>`).join('')}
        <span style="font-size:28px;font-weight:700;padding:10px 24px;border-radius:999px;background:${C.accent};color:#fff">pundo.cy</span>
      </div>
    </div>
  </div>`
await shot(W, H, banner, 'banner.png')
// QA preview: mark what each device shows
await shot(W, H, banner + `
  <div style="position:absolute;left:0;top:508px;width:${W}px;height:423px;outline:4px dashed #2563eb"></div>
  <div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;outline:6px solid #dc2626"></div>
  <div style="position:absolute;left:520px;top:940px;font:600 30px sans-serif;color:#dc2626">safe area (mobile) 1546x423</div>
  <div style="position:absolute;left:20px;top:460px;font:600 30px sans-serif;color:#2563eb">desktop 2560x423</div>
  <div style="position:absolute;left:20px;top:20px;font:600 30px sans-serif;color:#555">TV: full 2560x1440</div>`, 'banner-preview.png')

// ---------- avatar 800x800 (shown as circle, down to 98px) ----------
await shot(800, 800, `
  <div style="position:absolute;inset:0;background:radial-gradient(520px 520px at 70% 25%, ${C.accent_light} 0%, transparent 70%), ${C.bg};
    display:flex;align-items:center;justify-content:center">
    <div style="transform:translateY(-6px)">${pinSvg(520)}</div></div>`, 'avatar.png')

// ---------- watermark 150x150, transparent (video branding, bottom-right) ----------
await shot(150, 150, `
  <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center">
    ${pinSvg(100)}</div>`, 'watermark.png', { transparent: true })

await browser.close()
