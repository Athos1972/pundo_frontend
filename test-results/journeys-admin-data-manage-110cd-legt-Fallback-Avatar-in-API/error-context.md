# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/admin-data-management.spec.ts >> Admin Data Management Sweep >> Schritt 1 — Brand ohne Logo angelegt: Fallback-Avatar in API
- Location: e2e/journeys/admin-data-management.spec.ts:339:7

# Error details

```
Error: Brand ohne Logo konnte nicht angelegt werden

expect(received).not.toBeNull()

Received: null
```

# Test source

```ts
  242 | 
  243 |     // ── Setup: Find a pending shop-owner for moderation test ─────────────────
  244 |     const pendingOwnersRes = await apiFetch('GET', '/api/v1/admin/shop-owners?status=pending&limit=5', undefined, adminHeaders())
  245 |     const pendingOwners = (pendingOwnersRes.data as { items?: Array<{ id: number }> })?.items ?? []
  246 |     if (pendingOwners.length === 0) {
  247 |       // Create a fresh pending owner for the test
  248 |       const pendingEmail = `${PREFIX}-pending-owner@pundo-e2e.io`
  249 |       const pendingRegRes = await apiFetch('POST', '/api/v1/shop-owner/register', {
  250 |         email: pendingEmail,
  251 |         password: 'E2ePendingPw!99',
  252 |         name: `E2E Pending Owner ${UUID}`,
  253 |         shop_name: `${PREFIX}-pending-shop`,
  254 |         shop_address: 'Test Address, Larnaca, Cyprus',
  255 |       })
  256 |       if (pendingRegRes.ok) {
  257 |         ctx.pendingOwnerId = (pendingRegRes.data as { id: number }).id
  258 |         ctx.fixtures.push({ name: `${PREFIX}-pending-owner`, id: ctx.pendingOwnerId, built: true, deleted: false, type: 'owner' })
  259 |       }
  260 |     } else {
  261 |       ctx.pendingOwnerId = pendingOwners[0].id
  262 |     }
  263 |   })
  264 | 
  265 |   test.afterAll(async () => {
  266 |     const endedAt = new Date().toISOString()
  267 | 
  268 |     // Cleanup fixtures
  269 |     if (ctx.adminToken) {
  270 |       if (ctx.categoryChildId) {
  271 |         try { await apiFetch('DELETE', `/api/v1/admin/categories/${ctx.categoryChildId}`, undefined, adminHeaders()) } catch { /* ok */ }
  272 |       }
  273 |       if (ctx.categoryParentId) {
  274 |         try { await apiFetch('DELETE', `/api/v1/admin/categories/${ctx.categoryParentId}`, undefined, adminHeaders()) } catch { /* ok */ }
  275 |       }
  276 |       if (ctx.brandWithLogoId) {
  277 |         try { await apiFetch('DELETE', `/api/v1/admin/brands/${ctx.brandWithLogoId}`, undefined, adminHeaders()) } catch { /* ok */ }
  278 |       }
  279 |       if (ctx.brandWithoutLogoId) {
  280 |         try { await apiFetch('DELETE', `/api/v1/admin/brands/${ctx.brandWithoutLogoId}`, undefined, adminHeaders()) } catch { /* ok */ }
  281 |       }
  282 |       if (ctx.guideId) {
  283 |         try { await apiFetch('DELETE', `/api/v1/admin/guides/${ctx.guideId}`, undefined, adminHeaders()) } catch { /* ok */ }
  284 |       }
  285 |       // Reject pending owner (if we created them)
  286 |       if (ctx.pendingOwnerId && ctx.fixtures.find(f => f.name === `${PREFIX}-pending-owner`)) {
  287 |         try { await apiFetch('PATCH', `/api/v1/admin/shop-owners/${ctx.pendingOwnerId}`, { status: 'rejected' }, adminHeaders()) } catch { /* ok */ }
  288 |       }
  289 |     }
  290 | 
  291 |     for (const f of ctx.fixtures) {
  292 |       f.deleted = true // best-effort
  293 |     }
  294 | 
  295 |     // Write report
  296 |     const reportsDir = path.join(__dirname, 'reports')
  297 |     fs.mkdirSync(reportsDir, { recursive: true })
  298 |     const date = endedAt.slice(0, 10)
  299 |     const overallStatus = ctx.stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
  300 |     const findings = ctx.stepLog.filter(s => s.status === 'FAIL')
  301 | 
  302 |     const report = [
  303 |       `## Journey: Admin Data Management Sweep — ${overallStatus}`,
  304 |       `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
  305 |       '',
  306 |       '### Aufgebaute Test-Daten',
  307 |       '| Fixture | ID | Status |',
  308 |       '|---|---|---|',
  309 |       ...ctx.fixtures.map(f => `| ${f.name} | ${f.id ?? 'N/A'} | ${f.built ? 'OK' : 'FEHLER/SKIP'} |`),
  310 |       '',
  311 |       '### Endpoint-Unterstützung',
  312 |       `- Logo-Upload: ${ctx.logoUploadSupported ? 'ja' : 'nein (404)'}`,
  313 |       `- Admin-Categories: ${ctx.categoryAdminSupported ? 'ja' : 'nein'}`,
  314 |       `- Guides: ${ctx.guideSupported ? 'ja' : 'nein'}`,
  315 |       '',
  316 |       '### Schritt-für-Schritt-Protokoll',
  317 |       '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
  318 |       '|---|---|---|---|---|',
  319 |       ...ctx.stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
  320 |       '',
  321 |       '### Findings (FAIL-Einträge)',
  322 |       findings.length === 0 ? '_keine_' : [
  323 |         '| Schritt | Erwartet | Tatsächlich |',
  324 |         '|---|---|---|',
  325 |         ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} |`),
  326 |       ].join('\n'),
  327 |       '',
  328 |       '### Aufräumen',
  329 |       '| Fixture | Gelöscht | Status |',
  330 |       '|---|---|---|',
  331 |       ...ctx.fixtures.map(f => `| ${f.name} | best-effort | OK |`),
  332 |     ].join('\n')
  333 | 
  334 |     fs.writeFileSync(path.join(reportsDir, `admin-data-management-${date}.md`), report, 'utf8')
  335 |   })
  336 | 
  337 |   // ── Tests ─────────────────────────────────────────────────────────────────
  338 | 
  339 |   test('Schritt 1 — Brand ohne Logo angelegt: Fallback-Avatar in API', async ({ request }) => {
  340 |     if (!ctx.brandWithoutLogoId) {
  341 |       logStep(1, 'Brand ohne Logo anlegen', 'brandId gesetzt', 'POST /api/v1/admin/brands fehlgeschlagen', 'FAIL')
> 342 |       expect(ctx.brandWithoutLogoId, 'Brand ohne Logo konnte nicht angelegt werden').not.toBeNull()
      |                                                                                          ^ Error: Brand ohne Logo konnte nicht angelegt werden
  343 |       return
  344 |     }
  345 | 
  346 |     const res = await request.get(`${BACKEND_URL}/api/v1/admin/brands/${ctx.brandWithoutLogoId}`, {
  347 |       headers: adminHeaders(),
  348 |     })
  349 |     const ok = res.ok()
  350 |     let logoUrl: string | null = null
  351 |     if (ok) {
  352 |       const data = await res.json() as { logo_url?: string | null }
  353 |       logoUrl = data.logo_url ?? null
  354 |     }
  355 |     logStep(1, 'Brand ohne Logo — logo_url leer', 'logo_url: null', String(logoUrl), ok ? 'PASS' : 'FAIL')
  356 |     expect(ok, `Brand GET fehlgeschlagen: ${res.status()}`).toBe(true)
  357 |     // logo_url should be null for brand without logo
  358 |     expect(logoUrl, 'Brand ohne Logo hat logo_url gesetzt').toBeNull()
  359 |   })
  360 | 
  361 |   test('Schritt 2 — Brand mit Logo angelegt (Logo-Upload)', async ({ request }) => {
  362 |     if (!ctx.brandWithLogoId) {
  363 |       logStep(2, 'Brand mit Logo anlegen', 'brandId gesetzt', 'Brand-Create fehlgeschlagen', 'FAIL')
  364 |       expect(ctx.brandWithLogoId, 'Brand mit Logo konnte nicht angelegt werden').not.toBeNull()
  365 |       return
  366 |     }
  367 | 
  368 |     if (!ctx.logoUploadSupported) {
  369 |       logStep(2, 'Logo-Upload', 'Logo hochgeladen', '/api/v1/admin/brands/logo nicht gefunden (404)', 'SKIP')
  370 |       test.skip(true, 'Reason: Logo-Upload-Endpoint /api/v1/admin/brands/logo existiert nicht (404) — File-Upload-Feature nicht implementiert')
  371 |       return
  372 |     }
  373 | 
  374 |     // Attempt logo upload (PNG 1x1 pixel base64)
  375 |     const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  376 | 
  377 |     // Use multipart form
  378 |     const formData = new FormData()
  379 |     formData.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'test-logo.png')
  380 | 
  381 |     const uploadRes = await fetch(`${BACKEND_URL}/api/v1/admin/brands/${ctx.brandWithLogoId}/logo`, {
  382 |       method: 'POST',
  383 |       headers: adminHeaders(),
  384 |       body: formData,
  385 |     })
  386 | 
  387 |     const ok = uploadRes.ok
  388 |     logStep(2, 'Brand Logo-Upload', 'HTTP 200/201', `HTTP ${uploadRes.status}`, ok ? 'PASS' : 'FAIL')
  389 |     expect(ok, `Logo-Upload fehlgeschlagen: ${uploadRes.status}`).toBe(true)
  390 |   })
  391 | 
  392 |   test('Schritt 3 — Category-Tree: parent erscheint in Liste', async ({ request }) => {
  393 |     if (!ctx.categoryAdminSupported) {
  394 |       logStep(3, 'Category-Tree: parent anlegen', 'parent in Liste', 'Admin-Categories nicht unterstützt', 'SKIP')
  395 |       test.skip(true, 'Reason: /api/v1/admin/categories nicht verfügbar')
  396 |       return
  397 |     }
  398 |     if (!ctx.categoryParentId) {
  399 |       logStep(3, 'Category-Tree: parent anlegen', 'categoryParentId gesetzt', 'POST /api/v1/admin/categories fehlgeschlagen', 'FAIL')
  400 |       expect(ctx.categoryParentId, 'Category parent konnte nicht angelegt werden').not.toBeNull()
  401 |       return
  402 |     }
  403 | 
  404 |     const res = await request.get(`${BACKEND_URL}/api/v1/admin/categories?limit=100`, {
  405 |       headers: adminHeaders(),
  406 |     })
  407 |     expect(res.ok(), `Admin-Categories-GET fehlgeschlagen`).toBe(true)
  408 |     const data = await res.json() as { items?: Array<{ id: number }> }
  409 |     const items = data.items ?? []
  410 |     const found = items.some(c => c.id === ctx.categoryParentId)
  411 |     logStep(3, 'Category parent in Admin-Liste', 'categoryParentId in Liste', found ? 'gefunden' : 'nicht gefunden', found ? 'PASS' : 'FAIL')
  412 |     expect(found, `Category parent ${ctx.categoryParentId} nicht in Admin-Liste`).toBe(true)
  413 |   })
  414 | 
  415 |   test('Schritt 4 — Category-Tree: child unter parent angelegt', async ({ request }) => {
  416 |     if (!ctx.categoryAdminSupported) {
  417 |       logStep(4, 'Category child anlegen', 'child unter parent', 'Admin-Categories nicht unterstützt', 'SKIP')
  418 |       test.skip(true, 'Reason: /api/v1/admin/categories nicht verfügbar')
  419 |       return
  420 |     }
  421 |     if (!ctx.categoryChildId) {
  422 |       logStep(4, 'Category child anlegen', 'categoryChildId gesetzt', 'POST fehlgeschlagen (parent nicht angelegt?)', 'FAIL')
  423 |       expect(ctx.categoryChildId, 'Category child konnte nicht angelegt werden').not.toBeNull()
  424 |       return
  425 |     }
  426 | 
  427 |     // Verify child has correct parent_id
  428 |     const res = await request.get(`${BACKEND_URL}/api/v1/admin/categories/${ctx.categoryChildId}`, {
  429 |       headers: adminHeaders(),
  430 |     })
  431 |     expect(res.ok()).toBe(true)
  432 |     const data = await res.json() as { id: number; parent_id?: number | null }
  433 |     logStep(4, 'Category child parent_id', `parent_id = ${ctx.categoryParentId}`, String(data.parent_id), data.parent_id === ctx.categoryParentId ? 'PASS' : 'FAIL')
  434 |     expect(data.parent_id, `Category child hat falschen parent_id`).toBe(ctx.categoryParentId)
  435 |   })
  436 | 
  437 |   test('Schritt 5 — Admin: Category-Tree im Browser (Expand/Collapse)', async ({ page }) => {
  438 |     if (!ctx.categoryParentId) {
  439 |       logStep(5, 'Category-Tree im Browser', 'Tree-Element sichtbar', 'categoryParentId fehlt', 'SKIP')
  440 |       test.skip(true, 'Reason: categoryParentId nicht verfügbar')
  441 |       return
  442 |     }
```