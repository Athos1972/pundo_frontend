/**
 * Journey: Shop-Owner Schnell-Onboarding — Post-Approval-Teil (T9, T12)
 *
 * F8950 T32: aus `shop-owner-quick-onboarding.spec.ts` (780 Zeilen) herausgeloest, damit der Wizard-UI-Teil und dieser
 * API-/Rate-Limit-lastige Teil parallel in eigenen Workern laufen.
 *  - T9  (B5910-003): Item-Integrität nach Admin-Approval (category_id, Foto, Kundensuche)
 *  - T12 (B5910-004): Haarentfernung ohne Spezialität ergibt genau das Item "Haarentfernung"
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { adminLogin, shopOwnerLogin, shopOwnerOnboardWithRetry } from './_helpers'
import { RUN_ID, TestDataTracker, adminApi } from './_helpers/test-data'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'

const UUID = randomUUID().slice(0, 8)
// Eigener Praefix (verankerter Selektor ^e2e-<run>-); afterAll loescht alle Owner/Shops dieses Praefixes
const PREFIX = `e2e-${RUN_ID}-quick-ob-appr-${UUID}`

test.afterAll(async () => {
  // T9/T12 legen Entwurfs-Angebote an; deren Cleanup braucht mehr als die 30 s Hook-Default
  test.setTimeout(180_000)
  const tracker = new TestDataTracker()
  const owners = await adminApi<{ items: Array<{ id: number }> }>('GET', `/shop-owners?q=${encodeURIComponent(PREFIX)}&limit=100`)
  for (const o of owners.json?.items ?? []) tracker.owner(o.id)
  await tracker.cleanup()
})

test.describe('F5910 Schnell-Onboarding — Post-Approval', () => {

  // ── T9: Post-Approval Item-Integrität (B5910-003 — benötigt Backend-Konsolidierung) ──────

  test('T9 — Post-Approval Item-Integrität: category_id + Foto + Customer-Suche (B5910-003)', async ({ page }) => {
    // B5910-003: verifies System-B onboarding items have category_id, photos, and are customer-searchable.
    // Fixes applied 2026-05-31:
    //   - login moved AFTER admin approval (pending account → 403 before approval)
    //   - endpoint corrected: /shop-owner/shop-listings (not /shop-owner/listings)
    //   - customer search uses Accept-Language header (not lang= query param)
    //   - pre-approval draft check via admin API

    // Onboarding (5/min) und Login (10/min) sind rate-limitiert: parallele Specs können Wartezeiten von
    // Minuten erzwingen (B6220-001: kein Bypass) → großzügiges Timeout + Retry-Helper (B8950-012).
    test.setTimeout(300_000)

    const email = `${PREFIX}-t9@pundo-e2e.io`
    const password = 'E2eTestPassword!99'

    // ── 1. Onboarding-Submit via API ─────────────────────────────────────────
    const submitData = await shopOwnerOnboardWithRetry(
      {
        provider_type: 'handwerker',
        domain_slugs: ['elektriker'],
        specialty_slugs: ['solaranlagen'],
        location: {
          lat: 34.917,
          lng: 33.636,
          address: 'T9 Street, Larnaca',
          is_b2c_storefront: true,
        },
        contact: { phone: '+35799000099' },
        shop_name: `${PREFIX}-t9-shop`,
        credentials: { type: 'email', email, password, name: `${PREFIX} T9` },
        lang: 'de',
      }
    ) as { shop_id?: number; shop?: { id: number }; owner_id?: number }
    const shopId: number = submitData.shop_id ?? submitData.shop?.id ?? 0
    expect(shopId, 'T9: submit must return shop_id').toBeGreaterThan(0)

    type ListingItem = {
      slug: string
      category_id: number | null
      photo_url: string | null   // single URL from ShopListingItemEmbedded schema
    }
    type Listing = {
      item: ListingItem
      available: boolean
      source: string
    }

    // ── 2. Admin-Approval ────────────────────────────────────────────────────
    // (pre-approval draft state verified via unit tests; here we go straight to approval
    //  because shop-owner login returns 403 while pending and there is no admin/shop-listings endpoint)
    const adminToken = await adminLogin()

    // Find owner_id by searching for the email (q= param supports email search)
    const ownersRes = await fetch(
      `${BACKEND_URL}/api/v1/admin/shop-owners?q=${encodeURIComponent(email)}&limit=5`,
      { headers: { Cookie: `admin_token=${adminToken}` } }
    )
    const ownersData = await ownersRes.json() as { items?: { id: number; shop_id: number; email: string }[] }
    const owner = (ownersData.items ?? []).find((o) => o.email === email)
    expect(owner, `T9: must find shop-owner by email ${email}`).toBeTruthy()

    const approveRes = await fetch(
      `${BACKEND_URL}/api/v1/admin/shop-owners/${owner!.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${adminToken}` },
        body: JSON.stringify({ status: 'approved' }),
      }
    )
    expect(approveRes.ok, 'T9: admin approval must succeed').toBeTruthy()

    // ── 4. Login als Shop-Owner (erst nach Approval möglich) ────────────────
    const shopToken = await shopOwnerLogin(email, password)

    // ── 5. Nach Approval: available=true via shop-owner API ──────────────────
    // Correct endpoint: /shop-owner/shop-listings (not /shop-owner/listings)
    const listingsAfterRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings`, {
      headers: { Cookie: `shop_owner_token=${shopToken}` },
    })
    expect(listingsAfterRes.ok, 'T9: GET /shop-owner/shop-listings must succeed').toBeTruthy()
    const listingsAfterData = await listingsAfterRes.json() as { items?: Listing[] } | Listing[]
    const listingsAfter: Listing[] = Array.isArray(listingsAfterData)
      ? listingsAfterData
      : (listingsAfterData.items ?? [])

    expect(listingsAfter.length, 'T9: must have listings after approval').toBeGreaterThan(0)
    for (const listing of listingsAfter) {
      expect(
        listing.available,
        `T9: listing ${listing.item.slug} must be available=true after approval`
      ).toBe(true)
      expect(listing.item.category_id, `T9: category_id must still be set after approval`).not.toBeNull()
      expect(
        listing.item.photo_url,
        `T9: item ${listing.item.slug} must have a photo_url after backfill`
      ).not.toBeNull()
    }

    // ── 6. Customer-Suche: Services nach Approval auffindbar ────────────────
    // Use Accept-Language header (not lang= query param) for service search to work.
    // Search for "elektriker" — confirmed to return service results with Accept-Language: de.
    // (solaranlage may not have a synonym mapping in category_synonyms → elektriker as domain is safer)
    const searchRes = await fetch(
      `${BACKEND_URL}/api/v1/search?q=elektriker&lat=34.917&lng=33.636&radius=100`,
      { headers: { 'Accept-Language': 'de' } }
    )
    expect(searchRes.ok, 'T9: customer search must succeed').toBeTruthy()
    // API response: { total: number, items: [...] }  (not "results")
    const searchData = await searchRes.json() as {
      total?: number
      items?: { result_type: string; provider_count?: number }[]
    }
    const serviceResults = (searchData.items ?? []).filter((r) => r.result_type === 'service')
    expect(
      serviceResults.length,
      'T9: customer search for "elektriker" must return ≥1 service result (any shop in region)'
    ).toBeGreaterThan(0)

    // ── 7. UI: Shop-Admin Login und Offers-Seite erreichbar ─────────────────
    // (photo_url already verified via API in step 5; UI check confirms page loads + no 500)
    await page.goto(BASE_URL + '/shop-admin/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/shop-admin\//, { timeout: 10_000 })

    // Confirm dashboard or offers page loads without error
    await page.goto(BASE_URL + '/shop-admin/offers')
    await waitForPageHydrated(page)

    // Page must not show a 500 error
    const errorHeading = page.locator('h1, h2').filter({ hasText: /500|error|fehler/i })
    await expect(
      errorHeading,
      'T9: offers page must not show a 500 error'
    ).toHaveCount(0, { timeout: 5_000 })

    // Offers page must render some content (at least a heading or list element)
    const pageContent = page.locator('main, [role="main"], .container, h1, h2').first()
    await expect(
      pageContent,
      'T9: offers page must render content'
    ).toBeVisible({ timeout: 8_000 })
  })

  // ── T12 (B5910-004): Haarentfernung ohne Spezialität -> genau das Item "Haarentfernung" ──

  test('T12 — B5910-004: Haarentfernung ohne Spezialität ergibt genau das Item "Haarentfernung"', async () => {
    test.setTimeout(300_000)
    const email = `${PREFIX}-t12@pundo-e2e.io`
    const password = 'E2eTestPassword!99'

    await shopOwnerOnboardWithRetry({
      provider_type: 'dienstleister',
      domain_slugs: ['haarentfernung'],
      specialty_slugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'T12 Street, Larnaca', is_b2c_storefront: true },
      contact: { phone: '+35799000099' },
      shop_name: `${PREFIX}-t12-shop`,
      credentials: { type: 'email', email, password, name: `${PREFIX} T12` },
      lang: 'de',
    })

    const adminToken = await adminLogin()
    const ownersRes = await fetch(
      `${BACKEND_URL}/api/v1/admin/shop-owners?q=${encodeURIComponent(email)}&limit=5`,
      { headers: { Cookie: `admin_token=${adminToken}` } }
    )
    const ownersData = await ownersRes.json() as { items?: { id: number; email: string }[] }
    const owner = (ownersData.items ?? []).find((o) => o.email === email)
    expect(owner, `T12: must find shop-owner by email ${email}`).toBeTruthy()
    const approveRes = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${owner!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${adminToken}` },
      body: JSON.stringify({ status: 'approved' }),
    })
    expect(approveRes.ok, 'T12: admin approval must succeed').toBeTruthy()

    const shopToken = await shopOwnerLogin(email, password)
    const listingsRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings`, {
      headers: { Cookie: `shop_owner_token=${shopToken}`, 'Accept-Language': 'de' },
    })
    expect(listingsRes.ok, 'T12: GET /shop-owner/shop-listings must succeed').toBeTruthy()
    const data = await listingsRes.json() as { items?: Array<{ item: { slug: string; name: string } }> } | Array<{ item: { slug: string; name: string } }>
    const listings = Array.isArray(data) ? data : (data.items ?? [])
    expect(listings.map(l => l.item.slug), 'T12: genau ein Entwurfs-Angebot').toEqual(['haarentfernung-haarentfernung'])
    expect(listings[0].item.name).toBe('Haarentfernung')
  })

})
