# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/shop-admin-offers.spec.ts >> Shop-Admin Offers — Full Matrix >> B4 — [FINDING] Unlink product via PATCH product_id: null → documents backend behavior
- Location: e2e/journeys/shop-admin-offers.spec.ts:491:7

# Error details

```
Error: [FINDING B4] PATCH product_id: null should set product_id to null — backend bug

expect(received).toBeNull()

Received: 1
```

# Test source

```ts
  433 |     await waitHydrated(page)
  434 | 
  435 |     await page.locator('input[name="price"]').fill('7.50')
  436 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  437 |     await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
  438 | 
  439 |     // Verify via API that price was updated
  440 |     const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
  441 |     const items = (updData as { items: Array<{ id: number; price: string | null }> }).items
  442 |     const updated = items.find(o => o.id === offerId)
  443 |     expect(updated?.price, 'B2: price not updated').toBe('7.5000')
  444 | 
  445 |     // Price should also be visible in the list UI
  446 |     await page.goto(FRONTEND_URL + '/shop-admin/offers')
  447 |     await page.waitForLoadState('networkidle')
  448 |     await expect(page.getByText('7.5000').first()).toBeVisible()
  449 |   })
  450 | 
  451 |   test('B3 — Link a product to an existing offer → product relationship updated', async ({ page }) => {
  452 |     if (!ctx.productId) {
  453 |       test.skip(true, 'productId not available — product creation failed in beforeAll')
  454 |       return
  455 |     }
  456 | 
  457 |     // Create a fresh offer without product link
  458 |     const token = await getOwnerToken()
  459 |     const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
  460 |       title: 'B3 No Product Link',
  461 |       price: null,
  462 |       valid_from: '2026-06-01T00:00:00',
  463 |       valid_until: '2026-08-31T23:59:59',
  464 |     }, token)
  465 |     expect(status, 'B3 setup: create offer failed').toBe(201)
  466 |     const offerId = (data as { id: number }).id
  467 |     ctx.createdOfferIds.push(offerId)
  468 | 
  469 |     // Edit: add product link
  470 |     await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
  471 |     await waitHydrated(page)
  472 | 
  473 |     const productSelect = page.locator('select[name="product_id"]')
  474 |     const selectCount = await productSelect.count()
  475 |     if (selectCount === 0) {
  476 |       test.skip(true, 'product_id select not rendered — no products available for this shop')
  477 |       return
  478 |     }
  479 |     await productSelect.selectOption({ value: String(ctx.productId) })
  480 | 
  481 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  482 |     await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
  483 | 
  484 |     // Verify via API
  485 |     const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
  486 |     const items = (updData as { items: Array<{ id: number; product_id: number | null }> }).items
  487 |     const updated = items.find(o => o.id === offerId)
  488 |     expect(updated?.product_id, 'B3: product_id not updated').toBe(ctx.productId)
  489 |   })
  490 | 
  491 |   test('B4 — [FINDING] Unlink product via PATCH product_id: null → documents backend behavior', async () => {
  492 |     // FINDING: This test is annotated with test.fail() because the backend has a confirmed bug:
  493 |     // patch_offer() uses `if body.product_id is not None:` — null values are silently ignored.
  494 |     // PATCH { product_id: null } does NOT unlink the product.
  495 |     // Fix required in backend: use model_fields_set (Pydantic v2) to distinguish null from missing.
  496 |     // test.fail() means: this test PASSES when the assertion fails (expected failure),
  497 |     // and would FAIL if the bug is fixed (then test.fail() should be removed).
  498 |     test.fail()
  499 | 
  500 |     if (!ctx.productId) {
  501 |       test.skip(true, 'productId not available')
  502 |       return
  503 |     }
  504 | 
  505 |     const token = await getOwnerToken()
  506 |     const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
  507 |       title: 'B4 With Product Link',
  508 |       price: null,
  509 |       valid_from: '2026-06-01T00:00:00',
  510 |       valid_until: '2026-08-31T23:59:59',
  511 |       product_id: ctx.productId,
  512 |     }, token)
  513 |     expect(status, 'B4 setup: create offer failed').toBe(201)
  514 |     const offerId = (data as { id: number; product_id: number | null }).id
  515 |     const initialProductId = (data as { id: number; product_id: number | null }).product_id
  516 |     ctx.createdOfferIds.push(offerId)
  517 | 
  518 |     expect(initialProductId, 'B4: product_id not set after creation').toBe(ctx.productId)
  519 | 
  520 |     ctx.findings.push(
  521 |       'B4: PATCH /api/v1/shop-owner/offers/{id} with product_id: null does NOT unlink the product. ' +
  522 |       `product_id remains ${initialProductId}. ` +
  523 |       'Backend patch_offer() uses `if body.product_id is not None:` — null is silently skipped. ' +
  524 |       'Fix: use `if "product_id" in body.model_fields_set:` (Pydantic v2) to distinguish null from missing.'
  525 |     )
  526 | 
  527 |     // Attempt to unlink via PATCH product_id: null
  528 |     const patchRes = await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { product_id: null }, token)
  529 |     expect(patchRes.status).toBe(200)
  530 |     const updatedProductId = (patchRes.data as { product_id: number | null }).product_id
  531 | 
  532 |     // This assertion is EXPECTED TO FAIL (hence test.fail() above):
> 533 |     expect(updatedProductId, '[FINDING B4] PATCH product_id: null should set product_id to null — backend bug').toBeNull()
      |                                                                                                                 ^ Error: [FINDING B4] PATCH product_id: null should set product_id to null — backend bug
  534 |   })
  535 | 
  536 |   // ═══════════════════════════════════════════════════════════════════════════
  537 |   // GROUP C — Archive + Delete
  538 |   // ═══════════════════════════════════════════════════════════════════════════
  539 | 
  540 |   test('C1 — Archive active offer → offer moves to expired/archived tab', async ({ page }) => {
  541 |     if (!ctx.archiveOfferId) {
  542 |       test.skip(true, 'archiveOfferId not set (beforeAll fixture creation failed)')
  543 |       return
  544 |     }
  545 | 
  546 |     await page.goto(FRONTEND_URL + '/shop-admin/offers')
  547 |     await waitHydrated(page)
  548 | 
  549 |     // Confirm the offer is in active list first
  550 |     await expect(page.getByText('C-Setup Archive Target')).toBeVisible()
  551 | 
  552 |     // Find the archive button for this specific offer row
  553 |     const offerRow = page.locator('div').filter({ hasText: 'C-Setup Archive Target' }).first()
  554 |     const archiveBtn = offerRow.getByRole('button', { name: /archive|archivieren/i }).first()
  555 |     await archiveBtn.click()
  556 |     // Cancel button appears (confirmation step)
  557 |     await page.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
  558 |     // Click Archive to confirm
  559 |     await offerRow.getByRole('button', { name: /archive|archivieren/i }).first().click()
  560 | 
  561 |     // Offer should disappear from active tab
  562 |     await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })
  563 | 
  564 |     // Verify via API that archived=true
  565 |     const token = await getOwnerToken()
  566 |     const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
  567 |     const items = (data as { items: Array<{ id: number; archived: boolean }> }).items
  568 |     const archived = items.find(o => o.id === ctx.archiveOfferId)
  569 |     expect(archived?.archived, 'C1: offer not marked archived in API').toBe(true)
  570 | 
  571 |     // Switch to expired tab and verify it's there
  572 |     await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
  573 |     await expect(page.getByText('C-Setup Archive Target').first()).toBeVisible()
  574 |   })
  575 | 
  576 |   test('C2 — Delete archived offer → offer gone from list + API', async ({ page }) => {
  577 |     if (!ctx.archiveOfferId) {
  578 |       test.skip(true, 'archiveOfferId not set')
  579 |       return
  580 |     }
  581 | 
  582 |     // Ensure it's archived (C1 should have done this, but guarantee it)
  583 |     const token = await getOwnerToken()
  584 |     await apiPatch(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, { archived: true }, token)
  585 | 
  586 |     // Check if delete button is exposed in UI (expired tab)
  587 |     await page.goto(FRONTEND_URL + '/shop-admin/offers')
  588 |     await waitHydrated(page)
  589 |     await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
  590 |     await page.waitForLoadState('networkidle')
  591 | 
  592 |     // Look for delete button in expired tab
  593 |     const deleteBtn = page.getByRole('button', { name: /delete|löschen/i }).first()
  594 |     const hasDeleteInUI = await deleteBtn.count() > 0
  595 | 
  596 |     if (hasDeleteInUI) {
  597 |       await deleteBtn.click()
  598 |       const cancelBtn = page.getByRole('button', { name: /cancel|abbrechen/i })
  599 |       const hasCancelBtn = await cancelBtn.count() > 0
  600 |       if (hasCancelBtn) {
  601 |         await cancelBtn.waitFor({ state: 'visible' })
  602 |         await page.getByRole('button', { name: /delete|löschen/i }).first().click()
  603 |       }
  604 |       await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })
  605 |     } else {
  606 |       // Delete UI not implemented — delete via API directly (archive done above)
  607 |       ctx.findings.push(
  608 |         'C2: No delete button in UI for archived offers in the expired tab. ' +
  609 |         'Delete is only possible via direct API call. Frontend does not expose delete action.'
  610 |       )
  611 |       const delRes = await apiDelete(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, token)
  612 |       expect([200, 204], `C2: DELETE returned unexpected status ${delRes.status}`).toContain(delRes.status)
  613 |     }
  614 | 
  615 |     // Verify gone from API
  616 |     const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
  617 |     const items = (data as { items: Array<{ id: number }> }).items
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
```