# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-admin-e2e.spec.ts >> API Keys >> API Key löschen
- Location: e2e/shop-admin-e2e.spec.ts:257:7

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByText('E2E Test Key')
Expected: not visible
Received: visible
Timeout:  10000ms

Call log:
  - Expect "not toBeVisible" with timeout 10000ms
  - waiting for getByText('E2E Test Key')
    14 × locator resolved to <p class="text-sm font-medium text-gray-800">E2E Test Key</p>
       - unexpected value "visible"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: Pundo Shop
        - generic [ref=e6]: E2E Test Owner
      - navigation "Shop admin navigation" [ref=e7]:
        - list [ref=e8]:
          - listitem [ref=e9]:
            - link "Dashboard" [ref=e10] [cursor=pointer]:
              - /url: /shop-admin/dashboard
              - generic [ref=e11]: ⊞
              - text: Dashboard
          - listitem [ref=e12]:
            - link "Shop Profile" [ref=e13] [cursor=pointer]:
              - /url: /shop-admin/profile
              - generic [ref=e14]: 🏪
              - text: Shop Profile
          - listitem [ref=e15]:
            - link "Opening Hours" [ref=e16] [cursor=pointer]:
              - /url: /shop-admin/hours
              - generic [ref=e17]: 🕐
              - text: Opening Hours
          - listitem [ref=e18]:
            - link "Products" [ref=e19] [cursor=pointer]:
              - /url: /shop-admin/products
              - generic [ref=e20]: 📦
              - text: Products
          - listitem [ref=e21]:
            - link "Offers" [ref=e22] [cursor=pointer]:
              - /url: /shop-admin/offers
              - generic [ref=e23]: 🏷️
              - text: Offers
          - listitem [ref=e24]:
            - link "Import" [ref=e25] [cursor=pointer]:
              - /url: /shop-admin/import
              - generic [ref=e26]: ⬆
              - text: Import
          - listitem [ref=e27]:
            - link "API Keys" [ref=e28] [cursor=pointer]:
              - /url: /shop-admin/api-keys
              - generic [ref=e29]: 🔑
              - text: API Keys
      - button "Sign out" [ref=e31]
    - main [ref=e32]:
      - generic [ref=e33]:
        - heading "API Keys" [level=1] [ref=e34]
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]:
              - generic [ref=e38]:
                - paragraph [ref=e39]: Test Key
                - paragraph [ref=e40]: "Read · Created: 4/10/2026 · Last used: Never"
              - button "Delete" [ref=e41]
            - generic [ref=e42]:
              - generic [ref=e43]:
                - paragraph [ref=e44]: E2E Test Key
                - paragraph [ref=e45]: "Read · Created: 4/10/2026 · Last used: Never"
              - button "Delete" [ref=e46]
          - button "+ New API key" [ref=e47]
  - alert [ref=e48]
```

# Test source

```ts
  164 |     await page.locator('input[name="name"]').fill(TEST_PRODUCT)
  165 |     await page.locator('input[name="price"]').fill('4.99')
  166 |     await page.locator('input[name="unit"]').fill('l')
  167 |     // Select first real category (index 1, after the "—" placeholder at index 0)
  168 |     await page.locator('select[name="category_id"]').selectOption({ index: 1 })
  169 |     // Submit via role (logout button is now type="button", not type="submit")
  170 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  171 |     // Nach erfolgreichem Anlegen zurück zur Produktliste
  172 |     await expect(page).toHaveURL(/\/shop-admin\/products$/, { timeout: 15_000 })
  173 |     await expect(page.getByText(TEST_PRODUCT)).toBeVisible()
  174 |   })
  175 | 
  176 |   test('Produkt bearbeiten', async ({ page }) => {
  177 |     await page.goto('/shop-admin/products')
  178 |     await waitHydrated(page)
  179 |     // Edit-Link des ersten Produkts klicken
  180 |     const editLink = page.getByRole('link', { name: /edit|bearbeiten/i }).first()
  181 |     await editLink.click()
  182 |     await expect(page).toHaveURL(/\/edit/)
  183 |     await waitHydrated(page)
  184 |     const nameInput = page.locator('input[name="name"]')
  185 |     await nameInput.fill(`${TEST_PRODUCT} (bearbeitet)`)
  186 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  187 |     await expect(page).toHaveURL(/\/shop-admin\/products$/, { timeout: 15_000 })
  188 |     await expect(page.getByText(/bearbeitet/)).toBeVisible()
  189 |   })
  190 | 
  191 |   test('Produkt löschen', async ({ page }) => {
  192 |     await page.goto('/shop-admin/products')
  193 |     await waitHydrated(page)
  194 |     // Erstes Delete-Button klicken → Confirm → wieder Delete
  195 |     const deleteBtn = page.getByRole('button', { name: /delete|löschen/i }).first()
  196 |     await deleteBtn.click()
  197 |     // Confirm-Button erscheint
  198 |     await page.getByRole('button', { name: /delete|löschen/i }).first().click()
  199 |     // Produkt verschwindet aus Liste
  200 |     await expect(page.getByText(/bearbeitet/)).not.toBeVisible({ timeout: 10_000 })
  201 |   })
  202 | })
  203 | 
  204 | // ─── Angebote ────────────────────────────────────────────────────────────────
  205 | 
  206 | test.describe('Angebote CRUD', () => {
  207 |   const TEST_OFFER = 'E2E Sommer-Angebot 2026'
  208 | 
  209 |   test('Angebot anlegen', async ({ page }) => {
  210 |     await page.goto('/shop-admin/offers/new')
  211 |     await waitHydrated(page)
  212 |     await page.locator('input[name="title"]').fill(TEST_OFFER)
  213 |     await page.locator('input[name="price"]').fill('3.50')
  214 |     await page.locator('input[name="valid_from"]').fill('2026-06-01')
  215 |     await page.locator('input[name="valid_until"]').fill('2026-08-31')
  216 |     await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
  217 |     await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
  218 |     await expect(page.getByText(TEST_OFFER)).toBeVisible()
  219 |   })
  220 | 
  221 |   test('Angebot archivieren', async ({ page }) => {
  222 |     await page.goto('/shop-admin/offers')
  223 |     await waitHydrated(page)
  224 |     const archiveBtn = page.getByRole('button', { name: /archive|archivieren/i }).first()
  225 |     await archiveBtn.click()
  226 |     // Confirm
  227 |     await page.getByRole('button', { name: /archive|archivieren/i }).first().click()
  228 |     // Angebot verschwindet aus Active-Tab
  229 |     await expect(page.getByText(TEST_OFFER)).not.toBeVisible({ timeout: 10_000 })
  230 |     // Im Expired-Tab sichtbar
  231 |     await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
  232 |     await expect(page.getByText(TEST_OFFER)).toBeVisible()
  233 |   })
  234 | })
  235 | 
  236 | // ─── API Keys ────────────────────────────────────────────────────────────────
  237 | 
  238 | test.describe('API Keys', () => {
  239 |   test('API Key anlegen zeigt einmaligen Key', async ({ page }) => {
  240 |     await page.goto('/shop-admin/api-keys')
  241 |     await waitHydrated(page)
  242 |     // Click "Add" button (renders as "+ New API key")
  243 |     await page.getByRole('button', { name: /new api key|neuer api-key/i }).click()
  244 |     // Formular ausfüllen — aria-label ist der key_name string
  245 |     await page.locator('input[name="name"]').fill('E2E Test Key')
  246 |     await page.locator('select[name="scope"]').selectOption('read')
  247 |     await page.getByRole('button', { name: /new api key|add|neuer api-key|hinzufügen/i }).first().click()
  248 |     // Key wird einmalig angezeigt
  249 |     await expect(page.getByText(/shown only once|wird nur einmal/i)).toBeVisible({ timeout: 10_000 })
  250 |     // Key beginnt mit einem erkennbaren Muster (alphanumerisch, mind. 10 Zeichen)
  251 |     const keyEl = page.locator('code')
  252 |     await expect(keyEl).toBeVisible()
  253 |     const keyText = await keyEl.textContent()
  254 |     expect(keyText?.length).toBeGreaterThan(10)
  255 |   })
  256 | 
  257 |   test('API Key löschen', async ({ page }) => {
  258 |     await page.goto('/shop-admin/api-keys')
  259 |     await waitHydrated(page)
  260 |     const deleteBtn = page.getByRole('button', { name: /delete|löschen/i }).first()
  261 |     await deleteBtn.click()
  262 |     await page.getByRole('button', { name: /delete|löschen/i }).first().click()
  263 |     // Key ist weg
> 264 |     await expect(page.getByText('E2E Test Key')).not.toBeVisible({ timeout: 10_000 })
      |                                                      ^ Error: expect(locator).not.toBeVisible() failed
  265 |   })
  266 | })
  267 | 
  268 | // ─── Logout ───────────────────────────────────────────────────────────────────
  269 | 
  270 | test.describe('Logout', () => {
  271 |   test('Logout leitet zur Login-Seite weiter', async ({ page }) => {
  272 |     await page.goto('/shop-admin/dashboard')
  273 |     await waitHydrated(page)
  274 |     // Logout button is now type="button" (not type="submit") with onClick handler
  275 |     const logoutBtn = page.getByRole('button', { name: /sign out|ausloggen|logout/i })
  276 |     await logoutBtn.first().click()
  277 |     await expect(page).toHaveURL(/\/shop-admin\/login/, { timeout: 10_000 })
  278 |   })
  279 | })
  280 | 
```