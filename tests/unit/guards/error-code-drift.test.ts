// B8950-016 T18: backend error codes ↔ frontend error messages.
//
// `src/types/generated/error_codes.json` is the backend's list of machine-readable error codes per module
// (`node scripts/api-types.cjs sync`). The CRM admin UI maps them to messages in `crmFetch.ts`. A code the backend
// raises without a mapping here shows the generic "something went wrong"; a mapping for a code the backend no longer
// raises is dead weight. Both directions fail the gate. 409 codes are mapped like 422 codes (a 409 with a known code
// shows its own text, an unknown one the generic conflict text); 404/423/429/502 are handled by status.

import { describe, it, expect } from 'vitest'
import codes from '../../../src/types/generated/error_codes.json'
import { CRM_ERROR_KEYS, CRM_STATUS_KEYS } from '../../../src/components/system-admin/crm/crmFetch'
import { tSysAdmin } from '../../../src/lib/system-admin-translations'

type ByStatus = Record<string, string[]>
const all = codes as Record<string, ByStatus>

/** Statuses whose `detail` code selects the message (`crmRequest`); every other status is handled by status alone. */
const CODE_STATUSES = ['409', '422']

/** Modules whose errors reach the CRM admin UI (routers and the service they call). */
const crmModules = Object.keys(all).filter((m) => m.startsWith('api/admin/crm/') || m.startsWith('lib/crm/'))

describe('CRM error codes (backend ↔ crmFetch)', () => {
  it('finds the CRM modules', () => {
    expect(crmModules.length).toBeGreaterThanOrEqual(4)
  })

  const backendCodes = () => new Set(crmModules.flatMap((m) => CODE_STATUSES.flatMap((status) => all[m][status] ?? [])))

  it('every backend 409/422 code has a message', () => {
    const unmapped = [...backendCodes()].filter((c) => !(c in CRM_ERROR_KEYS))
    expect(unmapped, `backend 409/422 codes without an entry in CRM_ERROR_KEYS: ${unmapped.join(', ')}`).toEqual([])
  })

  it('every mapped code still exists in the backend', () => {
    const backend = backendCodes()
    const dead = Object.keys(CRM_ERROR_KEYS).filter((c) => !backend.has(c))
    expect(dead, `CRM_ERROR_KEYS entries the backend never raises: ${dead.join(', ')}`).toEqual([])
  })

  it('every mapped code has a non-empty text in EN and EL, and both keep the same placeholders', () => {
    const en = tSysAdmin('en') as unknown as Record<string, string>
    const el = tSysAdmin('el') as unknown as Record<string, string>
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',')
    for (const [code, key] of Object.entries(CRM_ERROR_KEYS)) {
      expect(en[key], `EN text for ${code} (${key})`).toBeTruthy()
      expect(el[key], `EL text for ${code} (${key})`).toBeTruthy()
      expect(placeholders(el[key]), `placeholders of ${key} differ between EN and EL`).toBe(placeholders(en[key]))
    }
  })

  it('every other status the CRM backend raises is handled by status', () => {
    const handled = new Set<string>([...Object.keys(CRM_STATUS_KEYS), '401', '422'])
    const statuses = new Set(crmModules.flatMap((m) => Object.keys(all[m])))
    const unhandled = [...statuses].filter((s) => !handled.has(s))
    expect(unhandled, `statuses without a handler in crmRequest: ${unhandled.join(', ')}`).toEqual([])
  })
})
