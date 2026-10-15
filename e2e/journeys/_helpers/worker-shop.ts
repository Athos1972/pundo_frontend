/**
 * Worker-Shop-Fixture (B8950-012, Option C).
 *
 * Pro Playwright-Worker legt die worker-scoped Fixture `workerShop` einmal einen eigenen Shop an
 * (`POST /admin/shops`), holt das Owner-Token per Impersonation (`POST /admin/shops/{id}/impersonate`,
 * kein Login-Rate-Limit) und ueberschreibt `storageState` mit diesem Token. Gleichzeitig laufende
 * Specs teilen so nie einen Shop. Nacheinander laufende Specs im selben Worker raeumen in `afterAll`
 * ihre Listings weg (`workerShop.cleanupSpecData()`); Teardown des Workers loescht den Shop
 * (kaskadiert Owner, Listings, Offers, exklusive Items + Foto-Dateien) und die getrackten Items.
 *
 * `specShop(spec)`: derselbe Mechanismus fuer eine Spec, die Shop-Einstellungen aendert, Foto-Uploads
 * macht (R16) oder Cross-Shop-Szenarien braucht. Der Aufrufer ruft `await shop.destroy()` in afterAll.
 *
 * Der globale `e2e-test-shop` bleibt nur fuer Login/Logout und Read-only-Pruefungen des echten
 * Passwort-Owners.
 */
import { test as base, expect } from '../../fixtures'
import { BACKEND_URL, BASE_URL } from '../../env'
import { makePng } from './png'
import {
  adminApi, ownerApi, RUN_ID, TestDataTracker, rand4, isMarkerSlug, e2eName, psql, type ApiResult,
} from './test-data'

export interface StorageStateCookie {
  name: string; value: string; domain: string; path: string
  expires: number; httpOnly: boolean; secure: boolean; sameSite: 'Lax' | 'Strict' | 'None'
}
export interface StorageState { cookies: StorageStateCookie[]; origins: never[] }

export interface CreatedItem { id: number; slug: string; name: string; listingId?: number }

export interface WorkerShop {
  id: number
  slug: string
  /** Name des Shops (en). */
  name: string
  ownerToken: string
  marker: string
  tracker: TestDataTracker
  storageState: StorageState
  /** Owner-API (`/api/v1/shop-owner`) mit dem Impersonation-Token. */
  api<T = unknown>(method: string, apiPath: string, body?: unknown): Promise<ApiResult<T>>
  /**
   * Legt ein Item mit Marker-Namen (`E2E-<RUN>-<SPEC>-<label>-<4hex>`) per Owner-API an, optional mit
   * Listing (`listing: true`). Das Item wird fuer den Teardown getrackt. Kategorie: zufaellig (der
   * Fuzzy-409 des Backends vergleicht Namen innerhalb einer Kategorie).
   */
  createItem(spec: string, label: string, opts?: { listing?: boolean; categoryId?: number }): Promise<CreatedItem>
  /**
   * Laedt ein gueltiges 64x64-PNG als Produktfoto des Items hoch (`POST /shop-owner/items/{id}/photos`).
   * `shade` macht die Pixel eindeutig (SHA-Dedup). Die Datei liegt danach im Dateisystem des Backends; nur der
   * Shop-Delete (`destroy`) raeumt sie weg.
   */
  uploadPhoto(itemId: number, shade?: number): Promise<{ status: number; text: string }>
  /** Pflicht-afterAll jeder Spec: Offers archivieren, Listings loeschen, Items fuer den Teardown merken. */
  cleanupSpecData(): Promise<void>
  /** Shop + getrackte Items loeschen (specShop: in afterAll; Worker-Shop macht das die Fixture). */
  destroy(): Promise<void>
}

function toStorageState(token: string): StorageState {
  return {
    cookies: [{
      name: 'shop_owner_token', value: token, domain: new URL(BASE_URL).hostname, path: '/',
      expires: -1, httpOnly: true, secure: false, sameSite: 'Lax',
    }],
    origins: [],
  }
}

async function createShop(slugPart: string, label: string): Promise<WorkerShop> {
  const slug = `e2e-${RUN_ID}-${slugPart}-${rand4()}`
  const name = `E2E-${RUN_ID}-${label} Shop`
  const created = await adminApi<{ id: number; slug: string }>('POST', '/shops', {
    slug, names: { en: name }, status: 'active', country_code: 'CY',
    address_line1: 'Finikoudes Beach 1', city: 'Larnaca', lat: 34.9177, lng: 33.6273,
  })
  if (created.status !== 201) throw new Error(`[worker-shop] Shop anlegen: ${created.status} ${created.text.slice(0, 200)}`)
  const id = created.json.id
  const imp = await adminApi<{ shop_owner_token: string }>('POST', `/shops/${id}/impersonate`)
  if (imp.status !== 200 || !imp.json?.shop_owner_token) {
    await adminApi('DELETE', `/shops/${id}`)
    throw new Error(`[worker-shop] Impersonation: ${imp.status} ${imp.text.slice(0, 200)}`)
  }
  const ownerToken = imp.json.shop_owner_token
  const tracker = new TestDataTracker()
  tracker.shop(id)

  const shop: WorkerShop = {
    id, slug, name, ownerToken, marker: `E2E-${RUN_ID}-${label}`, tracker,
    storageState: toStorageState(ownerToken),
    api: (method, apiPath, body) => ownerApi(ownerToken, method, apiPath, body),
    async createItem(spec, label, opts = {}) {
      const name = e2eName(spec, label)
      const categoryId = opts.categoryId
        ?? Number(psql('select category_id from items where category_id is not null order by random() limit 1'))
      const it = await shop.api<{ id: number; slug: string }>('POST', '/items', {
        name, name_lang: 'en', category_id: categoryId, confirmed: true,
      })
      if (it.status !== 201) throw new Error(`[worker-shop] Item anlegen: ${it.status} ${it.text.slice(0, 200)}`)
      tracker.item(it.json.id, it.json.slug)
      const created: CreatedItem = { id: it.json.id, slug: it.json.slug, name }
      if (opts.listing) {
        const l = await shop.api<{ id?: number }>('POST', '/shop-listings', { item_id: it.json.id })
        if (l.status !== 201 || !l.json?.id) throw new Error(`[worker-shop] Listing anlegen: ${l.status} ${l.text.slice(0, 200)}`)
        created.listingId = l.json.id
      }
      return created
    },
    async uploadPhoto(itemId, shade = 1) {
      const fd = new FormData()
      fd.append('file', new Blob([new Uint8Array(makePng(shade))], { type: 'image/png' }), `p${shade}.png`)
      const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}/photos`, {
        method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: fd, signal: AbortSignal.timeout(60_000),
      })
      const text = await res.text()
      if (res.status !== 201 && res.status !== 200) throw new Error(`[worker-shop] Foto hochladen: ${res.status} ${text.slice(0, 200)}`)
      return { status: res.status, text }
    },
    async cleanupSpecData() {
      // 1. Offers: aktive archivieren (Admin), dann ALLE per Owner-API loeschen. Ein Listing mit (auch nur
      //    archivierten) Offers laesst sich per Owner-API nicht loeschen (ORM versucht FK=NULL -> 500).
      const offers = await shop.api<{ items: { id: number; archived: boolean }[] }>('GET', '/offers?limit=500')
      for (const o of offers.json?.items ?? []) {
        if (!o.archived) {
          const a = await adminApi('DELETE', `/shop-owner-offers/${o.id}`)
          if (a.status !== 204 && a.status !== 404) throw new Error(`[worker-shop] Offer ${o.id} archivieren: ${a.status}`)
        }
        const d = await shop.api('DELETE', `/offers/${o.id}`)
        if (d.status !== 204 && d.status !== 404) throw new Error(`[worker-shop] Offer ${o.id} loeschen: ${d.status} ${d.text.slice(0, 160)}`)
      }
      // 2. Listings loeschen; Marker-Items fuer den Teardown merken
      const listings = await shop.api<{ items: { id: number; item_id: number; item: { slug: string } }[] }>(
        'GET', '/shop-listings?limit=500')
      for (const l of listings.json?.items ?? []) {
        if (isMarkerSlug(l.item?.slug)) tracker.item(l.item_id, l.item.slug)
        const r = await shop.api('DELETE', `/shop-listings/${l.id}`)
        if (r.status !== 204 && r.status !== 404) {
          throw new Error(`[worker-shop] Listing ${l.id} loeschen: ${r.status} ${r.text.slice(0, 160)}`)
        }
      }
    },
    async destroy() {
      await tracker.cleanup()
    },
  }
  return shop
}

/** Eigener Shop fuer eine Spec (Shop-Einstellungen, Foto-Upload, Cross-Shop). Aufrufer ruft `destroy()`. */
export function specShop(spec: string): Promise<WorkerShop> {
  const part = spec.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return createShop(part, spec.toUpperCase().replace(/[^A-Z0-9]+/g, '-'))
}

// `provide` statt `use`: Playwrights Fixture-Callback heisst `use`, ESLint hielte das fuer einen React-Hook.
export const test = base.extend<{ storageState: StorageState }, { workerShop: WorkerShop }>({
  workerShop: [async ({}, provide, workerInfo) => {
    const shop = await createShop(`w${workerInfo.parallelIndex}`, `W${workerInfo.parallelIndex}`)
    console.log(`[worker-shop] Worker ${workerInfo.parallelIndex}: Shop ${shop.id} (${shop.slug})`)
    try {
      await provide(shop)
    } finally {
      await shop.destroy()
    }
  }, { scope: 'worker' }],
  storageState: async ({ workerShop }, provide) => {
    await provide(workerShop.storageState)
  },
})

export { expect }
