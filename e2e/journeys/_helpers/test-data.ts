/**
 * E2E-Testdaten-Konvention (B8950-012) + Aufraeum-Helfer.
 *
 * Marker `E2E-<RUN>-<SPEC>` (RUN = UTC `YYYYMMDDHHMMSS`, einmal pro Playwright-Lauf, gesetzt im
 * globalSetup als `E2E_RUN_ID`). Alles, was eine Spec in `pundo_test` anlegt, traegt den Marker
 * am ANFANG des Namens/Slugs/der E-Mail. Verankerte Selektoren (`^e2e-<run>-`) im Backend-Skript
 * `scripts/e2e_test_data.py` raeumen Reste nach dem Lauf weg. NIE `LIKE '%e2e%'`.
 *
 * Aufraeumen primaer ueber die Admin-API (Shop-Delete kaskadiert Owner, Listings, Offers,
 * exklusive Items samt Foto-Dateien). Der Teardown `e2e/cleanup-run.ts` ist das Sicherheitsnetz.
 */
import { execFileSync } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { adminLogin } from '../_helpers'
import { BACKEND_URL } from '../../env'
import { generateRunId } from '../../run-lock'

export { BACKEND_URL }

export const STATE_FILE = path.join(__dirname, '..', '..', '.test-state.json')

/** Kurze Namen/Slugs duerfen nur `[A-Z0-9-]`. */
function cleanSpec(spec: string): string {
  return spec.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export { generateRunId }

function readStateRunId(): string | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as { runId?: string }
    return raw.runId
  } catch {
    return undefined
  }
}

/** env E2E_RUN_ID -> .test-state.json -> frisch erzeugt (und in env gesetzt, damit alle Module gleich sehen). */
export const RUN_ID: string = (() => {
  const id = process.env.E2E_RUN_ID || readStateRunId() || generateRunId()
  process.env.E2E_RUN_ID = id
  return id
})()

export function rand4(): string {
  return crypto.randomBytes(2).toString('hex')
}

export function marker(spec: string, runId: string = RUN_ID): string {
  return `E2E-${runId}-${cleanSpec(spec)}`
}

/** Name mit Marker am Anfang: `E2E-<RUN>-<SPEC>-<Label>-<4hex>` (Slug behaelt das Praefix `e2e-<run>-`). */
export function e2eName(spec: string, label: string): string {
  return `${marker(spec)}-${label}-${rand4()}`
}

export function e2eSlug(spec: string, label = ''): string {
  const parts = ['e2e', RUN_ID, cleanSpec(spec).toLowerCase(), label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), rand4()]
  return parts.filter(Boolean).join('-')
}

/** `e2e-<run>-<spec>-<rand>@pundo-e2e.io`; `pundo.com` nur dort, wo Auto-Approve (F6710) gebraucht wird. */
export function e2eEmail(spec: string, domain: 'pundo-e2e.io' | 'pundo.com' = 'pundo-e2e.io'): string {
  return `e2e-${RUN_ID}-${cleanSpec(spec).toLowerCase()}-${rand4()}@${domain}`
}

// ── Direkter DB-Zugriff (nur pundo_test) ──────────────────────────────────────

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

/** libpq-URL von pundo_test (env DATABASE_URL_TEST oder Backend-.env). Wirft, wenn nicht pundo_test. */
export function testDbUrl(): string {
  let url = process.env.DATABASE_URL_TEST
  if (!url) {
    try {
      url = fs.readFileSync(path.join(BACKEND_REPO, '.env'), 'utf8').match(/^DATABASE_URL_TEST=(.+)$/m)?.[1]?.trim()
    } catch { /* unten */ }
  }
  if (!url) throw new Error('DATABASE_URL_TEST nicht gesetzt und nicht in Backend-.env gefunden')
  url = url.replace('+psycopg', '')
  if (!/\/pundo_test(\?|$)/.test(url) || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error('DATABASE_URL_TEST zeigt nicht auf localhost/pundo_test - Abbruch')
  }
  return url
}

/** SQL gegen pundo_test (psql -At). Nur fuer gezielte Fixture-Eingriffe an EIGENEN Testzeilen. */
export function psql(sql: string): string {
  return execFileSync('psql', [testDbUrl(), '-Atc', sql], { encoding: 'utf8' }).trim()
}

/**
 * Zufaellige echte Kategorie mit mindestens `min` Items (Prod-Kopie). Fuer Seed-Items, die "verwandte Produkte"
 * brauchen: die Related-Abfrage liefert Items derselben Kategorie, ein leeres Fixture-Item haette keine Nachbarn.
 */
export function populatedCategoryId(min = 5): number {
  const id = Number(psql(
    `select category_id from items where category_id is not null group by category_id having count(*) >= ${Math.floor(min)} order by random() limit 1`,
  ))
  if (!id) throw new Error(`[e2e] keine Kategorie mit >= ${min} Items in pundo_test`)
  return id
}

// ── Admin API ────────────────────────────────────────────────────────────────

let cachedAdminToken: string | undefined

function readStateAdminToken(): string | undefined {
  try {
    return (JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as { adminToken?: string | null }).adminToken ?? undefined
  } catch {
    return undefined
  }
}

export async function getAdminToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedAdminToken) return cachedAdminToken
  const fromState = forceRefresh ? undefined : readStateAdminToken()
  cachedAdminToken = fromState ?? (await adminLogin())
  return cachedAdminToken
}

export interface ApiResult<T = unknown> { status: number; json: T; text: string }

async function doFetch<T>(method: string, url: string, headers: Record<string, string>, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* kein JSON */ }
  return { status: res.status, json: json as T, text }
}

/** Admin-Call (Cookie `admin_token`); bei 401 einmal mit frischem Login wiederholen. */
export async function adminApi<T = unknown>(method: string, apiPath: string, body?: unknown): Promise<ApiResult<T>> {
  const url = `${BACKEND_URL}/api/v1/admin${apiPath}`
  let token = await getAdminToken()
  let res = await doFetch<T>(method, url, { Cookie: `admin_token=${token}` }, body)
  if (res.status === 401) {
    token = await getAdminToken(true)
    res = await doFetch<T>(method, url, { Cookie: `admin_token=${token}` }, body)
  }
  return res
}

/** Shop-Owner-Call (Bearer) unter `/api/v1/shop-owner`. */
export async function ownerApi<T = unknown>(token: string, method: string, apiPath: string, body?: unknown): Promise<ApiResult<T>> {
  return doFetch<T>(method, `${BACKEND_URL}/api/v1/shop-owner${apiPath}`, { Authorization: `Bearer ${token}` }, body)
}

// ── Tracker ──────────────────────────────────────────────────────────────────

export interface CleanupReport {
  shopsDeleted: number
  itemsDeleted: number
  /** Items, die noch Listings in anderen Shops haben (409) - bleiben stehen, Reporter/Skript raeumt ggf. */
  itemConflicts: number[]
  /** Items ohne Test-Marker, die absichtlich NICHT geloescht wurden. */
  itemsKept: number[]
}

/** Ein Item darf nur geloescht werden, wenn Slug oder Name den Marker tragen. */
export function isMarkerSlug(slug: string | undefined): boolean {
  return !!slug && /^e2e-/i.test(slug)
}

export class TestDataTracker {
  private shops = new Set<number>()
  private items = new Map<number, string | undefined>()
  private owners = new Set<number>()

  shop(id: number): void { this.shops.add(id) }

  /**
   * Shop-Owner (Registrierung/Onboarding). Beim Cleanup wird sein Shop ermittelt und per Admin-Delete gelöscht
   * (kaskadiert den Owner); ohne Shop wird der Owner direkt gelöscht.
   */
  owner(id: number): void { this.owners.add(id) }

  /** `slug` angeben, wenn bekannt: dann wird nur bei Marker-Slug geloescht (Schutz echter Prod-Items). */
  item(id: number, slug?: string): void { this.items.set(id, slug) }

  get shopIds(): number[] { return [...this.shops] }
  get itemIds(): number[] { return [...this.items.keys()] }

  /** 1. Shops (Admin-Delete) 2. Items (Admin-Delete). Wirft bei unerwarteten Fehlern. */
  async cleanup(): Promise<CleanupReport> {
    const report: CleanupReport = { shopsDeleted: 0, itemsDeleted: 0, itemConflicts: [], itemsKept: [] }
    const errors: string[] = []
    for (const ownerId of this.owners) {
      const o = await adminApi<{ shop_id?: number | null }>('GET', `/shop-owners/${ownerId}`)
      if (o.status === 200 && o.json?.shop_id) this.shops.add(o.json.shop_id)
      else if (o.status === 200) {
        const d = await adminApi('DELETE', `/shop-owners/${ownerId}`)
        if (d.status !== 204 && d.status !== 404) errors.push(`DELETE owner ${ownerId} -> ${d.status} ${d.text.slice(0, 120)}`)
      } else if (o.status !== 404) errors.push(`GET owner ${ownerId} -> ${o.status}`)
    }
    this.owners.clear()
    for (const id of this.shops) {
      const r = await adminApi('DELETE', `/shops/${id}`)
      if (r.status === 204) report.shopsDeleted++
      else if (r.status !== 404) errors.push(`DELETE shop ${id} -> ${r.status} ${r.text.slice(0, 120)}`)
    }
    for (const [id, slug] of this.items) {
      if (slug !== undefined && !isMarkerSlug(slug)) { report.itemsKept.push(id); continue }
      const r = await adminApi('DELETE', `/items/${id}`)
      if (r.status === 204) report.itemsDeleted++
      else if (r.status === 409) report.itemConflicts.push(id)
      else if (r.status !== 404) errors.push(`DELETE item ${id} -> ${r.status} ${r.text.slice(0, 120)}`)
    }
    this.shops.clear()
    this.items.clear()
    if (report.itemConflicts.length) {
      console.warn(`[e2e cleanup] Items mit weiteren Listings bleiben stehen: ${report.itemConflicts.join(', ')}`)
    }
    if (errors.length) throw new Error(`[e2e cleanup] Fehler beim Aufraeumen:\n  ${errors.join('\n  ')}`)
    return report
  }
}
