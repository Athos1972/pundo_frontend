// B8950-016 T18: backend error codes ↔ frontend error messages.
//
// `src/types/generated/error_codes.json` is the backend's list of machine-readable error codes per module
// (`node scripts/api-types.cjs sync`). The CRM admin UI maps them to messages in `crmFetch.ts`. A code the backend
// raises without a mapping here shows the generic "something went wrong"; a mapping for a code the backend no longer
// raises is dead weight. Both directions fail the gate.

import { describe, it, expect } from 'vitest'
import codes from '../../../src/types/generated/error_codes.json'
import { CRM_ERROR_KEYS, CRM_STATUS_KEYS } from '../../../src/components/system-admin/crm/crmFetch'

type ByStatus = Record<string, string[]>
const all = codes as Record<string, ByStatus>

/** Modules whose errors reach the CRM admin UI (routers and the service they call). */
const crmModules = Object.keys(all).filter((m) => m.startsWith('api/admin/crm/') || m.startsWith('lib/crm/'))

describe('CRM error codes (backend ↔ crmFetch)', () => {
  it('finds the CRM modules', () => {
    expect(crmModules.length).toBeGreaterThanOrEqual(4)
  })

  it('every backend 422 code has a message', () => {
    const backend422 = new Set(crmModules.flatMap((m) => all[m]['422'] ?? []))
    const unmapped = [...backend422].filter((c) => !(c in CRM_ERROR_KEYS))
    expect(unmapped, `backend 422 codes without an entry in CRM_ERROR_KEYS: ${unmapped.join(', ')}`).toEqual([])
  })

  it('every mapped 422 code still exists in the backend', () => {
    const backend422 = new Set(crmModules.flatMap((m) => all[m]['422'] ?? []))
    const dead = Object.keys(CRM_ERROR_KEYS).filter((c) => !backend422.has(c))
    expect(dead, `CRM_ERROR_KEYS entries the backend never raises: ${dead.join(', ')}`).toEqual([])
  })

  it('every other status the CRM backend raises is handled by status', () => {
    const handled = new Set<string>([...Object.keys(CRM_STATUS_KEYS), '401', '422'])
    const statuses = new Set(crmModules.flatMap((m) => Object.keys(all[m])))
    const unhandled = [...statuses].filter((s) => !handled.has(s))
    expect(unhandled, `statuses without a handler in crmRequest: ${unhandled.join(', ')}`).toEqual([])
  })
})
