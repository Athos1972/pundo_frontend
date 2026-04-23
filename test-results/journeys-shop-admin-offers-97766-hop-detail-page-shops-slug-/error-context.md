# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/shop-admin-offers.spec.ts >> Shop-Admin Offers — Full Matrix >> D1 — Active offer visibility on customer shop detail page /shops/[slug]
- Location: e2e/journeys/shop-admin-offers.spec.ts:670:7

# Error details

```
Error: [FINDING D1] Active offer "B1 Updated Title" not visible on /shops/e2e-test-shop-larnaca-1

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Pundo — Zur Startseite" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Pundo" [ref=e6]
      - navigation [ref=e7]:
        - link "Shops" [ref=e8] [cursor=pointer]:
          - /url: /shops
        - link "Guides" [ref=e9] [cursor=pointer]:
          - /url: /guides
        - link "For Shops" [ref=e10] [cursor=pointer]:
          - /url: /for-shops
      - generic [ref=e11]:
        - generic [ref=e12]:
          - button "EN" [ref=e13]
          - button "DE" [ref=e14]
          - button "RU" [ref=e15]
          - button "ΕΛ" [ref=e16]
          - button "ع" [ref=e17]
          - button "עב" [ref=e18]
        - link "Sign in" [ref=e19] [cursor=pointer]:
          - /url: /auth/login
  - main [ref=e20]:
    - generic [ref=e21]:
      - button "Back" [ref=e22]:
        - img [ref=e23]
        - text: Back
      - generic [ref=e25]:
        - generic [ref=e26]:
          - img "E2E Test Shop Larnaca" [ref=e27]: E
          - heading "E2E Test Shop Larnaca" [level=1] [ref=e29]
        - paragraph [ref=e30]: Finikoudes Beach, Larnaca, Cyprus
      - generic [ref=e32]:
        - button "Marker" [ref=e33] [cursor=pointer]
        - generic:
          - generic [ref=e34]:
            - button "Zoom in" [ref=e35] [cursor=pointer]: +
            - button "Zoom out" [ref=e36] [cursor=pointer]: −
          - generic [ref=e37]:
            - link "Leaflet" [ref=e38] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e39]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e43] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e44] [cursor=pointer]:
              - /url: https://carto.com/
      - region "Reviews" [ref=e45]:
        - heading "Reviews" [level=2] [ref=e46]
        - group [ref=e47]:
          - generic "How do reviews work? ▾" [ref=e48] [cursor=pointer]:
            - generic [ref=e49]: How do reviews work?
            - generic [ref=e50]: ▾
        - generic [ref=e51]:
          - heading "Write a review" [level=3] [ref=e52]
          - paragraph [ref=e53]:
            - link "Sign in" [ref=e54] [cursor=pointer]:
              - /url: /auth/login
            - text: to write a review
        - paragraph [ref=e55]: No reviews yet. Be the first!
  - contentinfo [ref=e56]:
    - generic [ref=e57]:
      - navigation "legal" [ref=e58]:
        - link "About Us" [ref=e59] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e60] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e61] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e62] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e63] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e64] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e65] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e66]: © 2026 Buhl Consulting Ltd
  - button "AI Search" [ref=e67]:
    - img [ref=e68]
  - alert [ref=e70]
```

# Test source

```ts
  618 |     const found = items.find(o => o.id === ctx.archiveOfferId)
  619 |     expect(found, 'C2: deleted offer still appears in API').toBeUndefined()
  620 | 
  621 |     // Remove from cleanup list (already deleted)
  622 |     ctx.createdOfferIds = ctx.createdOfferIds.filter(id => id !== ctx.archiveOfferId)
  623 |     ctx.archiveOfferId = null
  624 |   })
  625 | 
  626 |   test('C3 — Delete active (non-archived) offer → 409 from backend', async ({ page }) => {
  627 |     // Create a fresh active offer
  628 |     const token = await getOwnerToken()
  629 |     const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
  630 |       title: 'C3 Active Cannot Delete',
  631 |       price: null,
  632 |       valid_from: '2026-06-01T00:00:00',
  633 |       valid_until: '2026-08-31T23:59:59',
  634 |     }, token)
  635 |     expect(status, 'C3 setup: create offer failed').toBe(201)
  636 |     const offerId = (data as { id: number }).id
  637 |     ctx.createdOfferIds.push(offerId)
  638 | 
  639 |     // Try to delete via API (not archived, not expired)
  640 |     const delRes = await apiDelete(`/api/v1/shop-owner/offers/${offerId}`, token)
  641 | 
  642 |     // Backend MUST reject with 409 for active non-expired offers
  643 |     if (delRes.status === 409) {
  644 |       // Correct behavior documented
  645 |       console.log('C3: Backend correctly returned 409 for deleting active non-expired offer')
  646 |     } else {
  647 |       ctx.findings.push(
  648 |         `C3: Expected HTTP 409 when deleting active offer, got ${delRes.status}. ` +
  649 |         'Backend should enforce archive-before-delete.'
  650 |       )
  651 |     }
  652 |     expect(delRes.status, 'C3: Backend should return 409 when deleting active (non-archived, non-expired) offer').toBe(409)
  653 | 
  654 |     // UI check: active tab should NOT show delete button
  655 |     await page.goto(FRONTEND_URL + '/shop-admin/offers')
  656 |     await waitHydrated(page)
  657 |     // OfferList only renders Archive button for active tab, not Delete
  658 |     // The delete button appears in the expired/archived tab
  659 |     const activeTabDeleteBtns = page.locator('button').filter({ hasText: /^delete$|^löschen$/i })
  660 |     const deleteCount = await activeTabDeleteBtns.count()
  661 |     if (deleteCount > 0) {
  662 |       ctx.findings.push('C3: UI shows Delete button for active offers — UI should not expose delete for active offers')
  663 |     }
  664 |   })
  665 | 
  666 |   // ═══════════════════════════════════════════════════════════════════════════
  667 |   // GROUP D — Customer-Facing Visibility
  668 |   // ═══════════════════════════════════════════════════════════════════════════
  669 | 
  670 |   test('D1 — Active offer visibility on customer shop detail page /shops/[slug]', async ({ page }) => {
  671 |     // FINDING: The customer shop detail page (/shops/[slug]) does not render shop_owner_offers.
  672 |     // The shop page source (src/app/(customer)/shops/[slug]/page.tsx) has no offers section.
  673 |     // Per spec D1: active offers should be visible to customers on the shop detail page.
  674 |     // This is a missing feature, not a bug in existing code. test.fail() documents this gap.
  675 |     test.fail()
  676 | 
  677 |     if (!ctx.shopSlug) {
  678 |       test.skip(true, 'shopSlug not available — cannot test customer-facing page')
  679 |       return
  680 |     }
  681 | 
  682 |     // Verify we have at least one active offer in the list
  683 |     const token = await getOwnerToken()
  684 |     const { data } = await apiGet('/api/v1/shop-owner/offers?archived=false', token)
  685 |     const activeItems = (data as { items: Array<{ id: number; title: string }> }).items
  686 | 
  687 |     if (activeItems.length === 0) {
  688 |       test.skip(true, 'No active offers to verify — create tests may have failed')
  689 |       return
  690 |     }
  691 | 
  692 |     // Use the first active offer's title
  693 |     const offerToCheck = activeItems[0]
  694 | 
  695 |     // Navigate to customer-facing shop page
  696 |     await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
  697 |     await page.waitForLoadState('networkidle')
  698 | 
  699 |     const url = page.url()
  700 |     expect(url, 'D1: shop page returned 404').not.toContain('404')
  701 |     expect(url, 'D1: redirected to not-found').not.toContain('not-found')
  702 | 
  703 |     const bodyText = await page.locator('body').innerText()
  704 |     const offerTitleVisible = bodyText.includes(offerToCheck.title)
  705 |     const hasOffersSection = bodyText.toLowerCase().includes('offer') || bodyText.toLowerCase().includes('angebot')
  706 | 
  707 |     if (!offerTitleVisible) {
  708 |       ctx.findings.push(
  709 |         `D1: Active offer "${offerToCheck.title}" is NOT visible on customer shop page /shops/${ctx.shopSlug}. ` +
  710 |         `hasOffersSection=${hasOffersSection}. ` +
  711 |         'The shop detail page (/shops/[slug]) does not render shop_owner_offers. ' +
  712 |         'Per spec: active offers SHOULD be visible to customers on the shop detail page.'
  713 |       )
  714 |       console.warn(`[FINDING D1] Active offer not shown on customer shop page /shops/${ctx.shopSlug}`)
  715 |     }
  716 | 
  717 |     // Per spec: active offers must be visible. This is a hard assertion.
> 718 |     expect(offerTitleVisible, `[FINDING D1] Active offer "${offerToCheck.title}" not visible on /shops/${ctx.shopSlug}`).toBe(true)
      |                                                                                                                          ^ Error: [FINDING D1] Active offer "B1 Updated Title" not visible on /shops/e2e-test-shop-larnaca-1
  719 |   })
  720 | 
  721 |   test('D2 — Archived offer NOT visible on customer shop detail page', async ({ page }) => {
  722 |     if (!ctx.shopSlug) {
  723 |       test.skip(true, 'shopSlug not available')
  724 |       return
  725 |     }
  726 | 
  727 |     // Create and immediately archive an offer
  728 |     const token = await getOwnerToken()
  729 |     const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
  730 |       title: 'D2 Archived Should Be Hidden',
  731 |       price: null,
  732 |       valid_from: '2026-01-01T00:00:00',
  733 |       valid_until: '2026-01-31T23:59:59',
  734 |     }, token)
  735 |     expect(status, 'D2 setup: create offer failed').toBe(201)
  736 |     const offerId = (data as { id: number }).id
  737 |     ctx.createdOfferIds.push(offerId)
  738 | 
  739 |     // Archive it
  740 |     await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)
  741 | 
  742 |     // Navigate to customer shop page
  743 |     await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
  744 |     await page.waitForLoadState('networkidle')
  745 | 
  746 |     const bodyText = await page.locator('body').innerText()
  747 |     const hasArchivedOffer = bodyText.includes('D2 Archived Should Be Hidden')
  748 | 
  749 |     expect(hasArchivedOffer, 'D2: Archived offer is visible on customer-facing shop page — should be hidden').toBe(false)
  750 |   })
  751 | 
  752 |   // ═══════════════════════════════════════════════════════════════════════════
  753 |   // REGRESSION — price: null vs "" regression check
  754 |   // ═══════════════════════════════════════════════════════════════════════════
  755 | 
  756 |   test('REGRESSION — OfferForm sends price: null (not empty string) when price field is empty', async ({ page }) => {
  757 |     await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
  758 |     await waitHydrated(page)
  759 | 
  760 |     // Intercept the POST to /api/shop-admin/offers and capture the request body
  761 |     let capturedBody: Record<string, unknown> | null = null
  762 |     page.on('request', req => {
  763 |       if (req.url().includes('/api/shop-admin/offers') && req.method() === 'POST') {
  764 |         try {
  765 |           capturedBody = JSON.parse(req.postData() ?? '{}')
  766 |         } catch { /* ignore */ }
  767 |       }
  768 |     })
  769 | 
  770 |     await page.locator('input[name="title"]').fill('REGRESSION Empty Price Test')
  771 |     // Explicitly clear the price field (ensure it's empty)
  772 |     const priceField = page.locator('input[name="price"]')
  773 |     await priceField.clear()
  774 |     await priceField.fill('')
  775 |     await page.locator('input[name="valid_from"]').fill('2026-06-01')
  776 |     await page.locator('input[name="valid_until"]').fill('2026-08-31')
  777 | 
  778 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  779 |     await page.waitForTimeout(2000)
  780 | 
  781 |     if (capturedBody) {
  782 |       expect(
  783 |         capturedBody.price,
  784 |         `REGRESSION: OfferForm sent price="${capturedBody.price}" instead of null — the price:'' bug is back`
  785 |       ).toBeNull()
  786 |     } else {
  787 |       // Couldn't capture body (maybe form redirected too fast)
  788 |       // Verify via API instead
  789 |       await page.waitForURL(/\/shop-admin\/offers/, { timeout: 5000 }).catch(() => {})
  790 |     }
  791 | 
  792 |     // Clean up if offer was created
  793 |     const token = await getOwnerToken()
  794 |     const { data } = await apiGet('/api/v1/shop-owner/offers', token)
  795 |     const items = (data as { items: Array<{ id: number; title: string }> }).items
  796 |     const created = items.find(o => o.title === 'REGRESSION Empty Price Test')
  797 |     if (created) ctx.createdOfferIds.push(created.id)
  798 |   })
  799 | })
  800 | 
```