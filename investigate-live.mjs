import { chromium } from '/Users/bb_studio_2025/dev/github/pundo_frontend/node_modules/playwright/index.js'

const TARGET = 'https://pundo.cy/en/search?q=huhn'
const now = Math.floor(Date.now() / 1000)
console.log(`Time: ${new Date().toISOString()} (unix: ${now})`)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  viewport: { width: 390, height: 844 },
})
const page = await ctx.newPage()

const imgRequests = []

page.on('response', async (resp) => {
  const url = resp.url()
  if (!url.includes('product_images')) return
  try {
    const h = resp.headers()
    const u = new URL(url)
    const expires = u.searchParams.get('expires')
    imgRequests.push({
      url: url.slice(0, 120),
      status: resp.status(),
      expires: expires ? +expires : null,
      cacheControl: h['cache-control'],
      cfCache: h['cf-cache-status'],
      age: h['age'],
    })
  } catch {}
})

console.log(`\nNavigating ...`)
await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 40000 })
await page.waitForTimeout(2000)

const snap = async (label) => {
  const r = await page.evaluate(() => {
    const imgs = [...document.images]
    return {
      total: imgs.length,
      loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
      loading: imgs.filter(i => !i.complete).length,
      brokenSrcs: imgs.filter(i => i.complete && i.naturalWidth === 0)
                      .slice(0, 3).map(i => i.src.slice(0, 140)),
    }
  })
  console.log(`\n[${label}] total=${r.total} loaded=${r.loaded} broken=${r.broken} loading=${r.loading}`)
  if (r.broken > 0) r.brokenSrcs.forEach(s => console.log(`  broken: ${s}`))
  return r
}

await snap('initial')

for (let i = 0; i < 8; i++) {
  await page.evaluate(() => window.scrollBy(0, 500))
  await page.waitForTimeout(800)
}
await page.waitForTimeout(2000)

const finalSnap = await snap('after scroll')

console.log(`\n=== Network: product_images ===`)
console.log(`Total requests: ${imgRequests.length}`)
const byStatus = {}
for (const r of imgRequests) byStatus[r.status] = (byStatus[r.status]||0)+1
console.log(`By status: ${JSON.stringify(byStatus)}`)

const failed = imgRequests.filter(r => r.status >= 400)
if (failed.length) {
  console.log(`\nFailed requests (${failed.length}):`)
  for (const r of failed.slice(0, 8)) {
    const ttlLeft = r.expires ? r.expires - now : null
    console.log(`  HTTP ${r.status} | expires=${r.expires ? new Date(r.expires*1000).toISOString() : 'n/a'} | ttl_left=${ttlLeft !== null ? ttlLeft+'s ('+((ttlLeft/3600).toFixed(1))+'h)' : 'n/a'} | age=${r.age ?? '-'} | cf=${r.cfCache ?? '-'}`)
  }
} else {
  console.log('No failed image requests.')
}

const ok200 = imgRequests.filter(r => r.status === 200)
if (ok200.length) {
  console.log(`\nSample OK request:`)
  const r = ok200[0]
  const ttlLeft = r.expires ? r.expires - now : null
  console.log(`  cache-control: ${r.cacheControl}`)
  console.log(`  cf-cache-status: ${r.cfCache}`)
  console.log(`  token TTL left: ${ttlLeft !== null ? ttlLeft+'s ('+((ttlLeft/3600).toFixed(1))+'h)' : 'n/a'}`)
}

if (finalSnap.broken > 0 && failed.length === 0) {
  console.log(`\n⚠️  Bilder broken im DOM aber KEIN failed network request!`)
  console.log(`   Mögliche Ursachen: Browser-Cache liefert alten 403/410,`)
  console.log(`   oder Bild-URL ist leer/ungültig, oder CORS/CSP blockiert.`)
  
  // Check if broken images have empty src or non-product_images URLs
  const brokenInfo = await page.evaluate(() => {
    return [...document.images]
      .filter(i => i.complete && i.naturalWidth === 0)
      .map(i => ({ src: i.src.slice(0, 150), currentSrc: i.currentSrc.slice(0, 80) }))
  })
  console.log(`\nBroken img srcs:`)
  brokenInfo.slice(0, 5).forEach(b => console.log(`  src=${b.src}`))
}

await browser.close()
