# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-admin-e2e.spec.ts >> Produkte CRUD >> Produkt löschen
- Location: e2e/shop-admin-e2e.spec.ts:191:7

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByText(/bearbeitet/)
Expected: not visible
Received: visible
Timeout:  10000ms

Call log:
  - Expect "not toBeVisible" with timeout 10000ms
  - waiting for getByText(/bearbeitet/)
    14 × locator resolved to <p class="text-sm font-medium text-gray-800 truncate">E2E Testprodukt Olivenöl (bearbeitet)</p>
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
        - generic [ref=e34]:
          - heading "Products & Services" [level=1] [ref=e35]
          - link "+ Add product" [ref=e36] [cursor=pointer]:
            - /url: /shop-admin/products/new
        - generic [ref=e37]:
          - generic [ref=e38]:
            - generic [ref=e39]:
              - paragraph [ref=e40]: E2E Testprodukt Olivenöl (bearbeitet)
              - paragraph [ref=e41]: 4.9900 EUR / l · Available
            - generic [ref=e42]:
              - link "Edit" [ref=e43] [cursor=pointer]:
                - /url: /shop-admin/products/2/edit
              - button "Delete" [ref=e44]
          - generic [ref=e45]:
            - generic [ref=e46]:
              - paragraph [ref=e47]: E2E Testprodukt Olivenöl
              - paragraph [ref=e48]: 4.9900 EUR / l · Available
            - generic [ref=e49]:
              - link "Edit" [ref=e50] [cursor=pointer]:
                - /url: /shop-admin/products/4/edit
              - button "Delete" [ref=e51]
  - alert [ref=e52]
```

# Test source

```ts
  100 |     await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible()
  101 |     await expect(page.getByRole('link', { name: /products|produkte/i }).first()).toBeVisible()
  102 |     await expect(page.getByRole('link', { name: /offers|angebote/i }).first()).toBeVisible()
  103 |     await expect(page.getByRole('link', { name: /api keys/i }).first()).toBeVisible()
  104 |   })
  105 | })
  106 | 
  107 | // ─── Profil ────────────────────────────────────────────────────────────────────
  108 | 
  109 | test.describe('Shop Profil', () => {
  110 |   test('Profil-Seite lädt mit Shop-Daten', async ({ page }) => {
  111 |     await page.goto('/shop-admin/profile')
  112 |     // Shop-Name soll vorausgefüllt sein
  113 |     const nameInput = page.locator('input[name="name"]')
  114 |     await expect(nameInput).toBeVisible()
  115 |     const value = await nameInput.inputValue()
  116 |     expect(value.length).toBeGreaterThan(0)
  117 |   })
  118 | 
  119 |   test('Profil speichern funktioniert', async ({ page }) => {
  120 |     await page.goto('/shop-admin/profile')
  121 |     await waitHydrated(page)
  122 |     const descField = page.locator('textarea[name="description"]')
  123 |     await descField.fill('Automatisch getestete Beschreibung – E2E')
  124 |     // Use role=button with name to avoid strict mode violations
  125 |     await page.getByRole('button', { name: /^save$|^speichern$|^gespeichert/i }).first().click()
  126 |     // Toast "Saved" soll erscheinen
  127 |     await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 10_000 })
  128 |   })
  129 | })
  130 | 
  131 | // ─── Öffnungszeiten ──────────────────────────────────────────────────────────
  132 | 
  133 | test.describe('Öffnungszeiten', () => {
  134 |   test('Öffnungszeiten-Seite zeigt 7 Checkboxen', async ({ page }) => {
  135 |     await page.goto('/shop-admin/hours')
  136 |     const checkboxes = page.locator('input[type="checkbox"]')
  137 |     await expect(checkboxes).toHaveCount(7)
  138 |   })
  139 | 
  140 |   test('Öffnungszeiten speichern funktioniert', async ({ page }) => {
  141 |     await page.goto('/shop-admin/hours')
  142 |     await waitHydrated(page)
  143 |     // New shops have all days closed by default — uncheck the first day to open it
  144 |     const firstCheckbox = page.locator('input[type="checkbox"]').first()
  145 |     const isClosed = await firstCheckbox.isChecked()
  146 |     if (isClosed) await firstCheckbox.click()
  147 |     // Ersten Tag auf 09:00–18:00 setzen (aria-label immer auf Englisch "open from" / "close at")
  148 |     await page.locator('input[type="time"][aria-label*="open from"]').first().fill('09:00')
  149 |     await page.locator('input[type="time"][aria-label*="close at"]').first().fill('18:00')
  150 |     // Save button — use role to be specific
  151 |     await page.getByRole('button', { name: /save hours|öffnungszeiten speichern|save/i }).first().click()
  152 |     await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 10_000 })
  153 |   })
  154 | })
  155 | 
  156 | // ─── Produkte ────────────────────────────────────────────────────────────────
  157 | 
  158 | test.describe('Produkte CRUD', () => {
  159 |   const TEST_PRODUCT = 'E2E Testprodukt Olivenöl'
  160 | 
  161 |   test('Produkt anlegen', async ({ page }) => {
  162 |     await page.goto('/shop-admin/products/new')
  163 |     await waitHydrated(page)
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
> 200 |     await expect(page.getByText(/bearbeitet/)).not.toBeVisible({ timeout: 10_000 })
      |                                                    ^ Error: expect(locator).not.toBeVisible() failed
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
  264 |     await expect(page.getByText('E2E Test Key')).not.toBeVisible({ timeout: 10_000 })
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