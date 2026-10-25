// Contract test: the route table of the admin UI against the backend OpenAPI snapshot (src/types/generated/openapi.json,
// copy of the backend docs/openapi.json). A route the backend renames, moves or drops fails here, not in the browser.
import { describe, expect, it } from 'vitest'
import openapi from '../types/generated/openapi.json'
import { CRM_ROUTES, crmPath, type CrmRouteName } from '@/components/system-admin/crm/crmPaths'

const paths = openapi.paths as Record<string, Record<string, unknown>>
const PREFIX = '/api/v1/admin/'
const names = Object.keys(CRM_ROUTES) as CrmRouteName[]

describe('CRM_ROUTES against the backend OpenAPI', () => {
  it.each(names)('%s exists with its method', (name) => {
    const { method, path } = CRM_ROUTES[name]
    const entry = paths[PREFIX + path]
    expect(entry, `${method} ${PREFIX}${path} is not in the backend OpenAPI`).toBeDefined()
    expect(Object.keys(entry), `${PREFIX}${path} has no ${method}`).toContain(method.toLowerCase())
  })

  it('every admin CRM route of the backend is in the table (or on purpose not used by the UI)', () => {
    const inTable = new Set(names.map((name) => `${CRM_ROUTES[name].method} ${PREFIX}${CRM_ROUTES[name].path}`))
    // `/addresses` is not used by the admin UI (addresses are sent inline in the person/org/relation body)
    const notUsed = new Set(['GET /api/v1/admin/crm/addresses', 'POST /api/v1/admin/crm/addresses'])
    const missing: string[] = []
    for (const [path, methods] of Object.entries(paths)) {
      if (!path.startsWith(`${PREFIX}crm/`)) continue
      for (const method of Object.keys(methods)) {
        const key = `${method.toUpperCase()} ${path}`
        if (!inTable.has(key) && !notUsed.has(key)) missing.push(key)
      }
    }
    expect(missing, `backend CRM routes without an entry in CRM_ROUTES: ${missing.join(', ')}`).toEqual([])
  })

  it('the old contact routes are gone from the backend and from the table', () => {
    expect(Object.keys(paths).filter((path) => path.includes('/crm/contacts'))).toEqual([])
    expect(names.filter((name) => CRM_ROUTES[name].path.includes('contacts'))).toEqual([])
  })

  it('path parameters in the table use the backend parameter names', () => {
    for (const name of names) {
      const { method, path } = CRM_ROUTES[name]
      const operation = paths[PREFIX + path]?.[method.toLowerCase()] as { parameters?: Array<{ name: string; in: string }> } | undefined
      const declared = (operation?.parameters ?? []).filter((p) => p.in === 'path').map((p) => p.name).sort()
      const used = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      expect(used, name).toEqual(declared)
    }
  })
})

describe('crmPath', () => {
  it('fills and encodes path parameters', () => {
    expect(crmPath('orgLead', { org_id: 7 })).toBe('crm/orgs/7/lead')
    expect(crmPath('orgChannelRemove', { org_id: 7, channel_id: 11 }, { mark_unreachable: true })).toBe('crm/orgs/7/channels/11?mark_unreachable=true')
    expect(crmPath('relationRoleRemove', { relation_id: 5, role: 'area manager/west' })).toBe('crm/relations/5/roles/area%20manager%2Fwest')
    expect(crmPath('orgCardImage', { org_id: 7, source_id: 1, side: 'front' })).toBe('crm/orgs/7/sources/1/card-image/front')
  })

  it('routes without parameters take the query as the only argument', () => {
    expect(crmPath('orgList')).toBe('crm/orgs')
    expect(crmPath('orgList', { q: 'alpha co', lead_only: true })).toBe('crm/orgs?q=alpha%20co&lead_only=true')
    expect(crmPath('reviewList', { category: 'legacy', limit: 50, offset: 0 })).toBe('crm/review?category=legacy&limit=50&offset=0')
  })

  it('query skips null, undefined and empty values but keeps 0 and false', () => {
    expect(crmPath('orgList', { q: '', lead_state: undefined, owner_id: null, lead_only: false, offset: 0 })).toBe('crm/orgs?lead_only=false&offset=0')
  })

  it('a missing path parameter fails loudly instead of producing a broken URL', () => {
    // @ts-expect-error -- the type already rejects the missing parameter; this checks the runtime guard behind it
    expect(() => crmPath('orgLead', {})).toThrow('missing path parameter org_id')
    expect(() => crmPath('orgLead', { org_id: '' })).toThrow('missing path parameter org_id')
  })
})
