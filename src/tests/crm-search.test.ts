import { afterEach, describe, expect, it, vi } from 'vitest'
import { orgHitToItem, personToItem, searchCrmOrgs, searchCrmPersons, searchErrorText, ORG_SEARCH_MIN, PERSON_SEARCH_MIN } from '@/components/system-admin/crm/crmSearch'
import { CrmSearchError, CRM_ERROR_KEYS } from '@/components/system-admin/crm/crmFetch'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { components } from '@/types/generated/backend'

// Typed by the generated backend schema (contract V1/V3): a renamed backend field breaks the compile, not the page
// (FastAPI always serialises fields with a default, so the optional ones are required here, as contracts.ts compares them)
type OrgHit = Required<components['schemas']['OrgSearchHit']>
type PersonOut = components['schemas']['PersonOut']

const tr = tSysAdmin('en')
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const bakeryNic: OrgHit = { id: 41, name: 'Alpha Bakery', legal_name: 'Alpha Bakery Ltd', city: 'Nicosia', category: 'bakery', business_status: 'unknown' }
const person: PersonOut = {
  id: 17, display_name: 'Alex', address_id: null, address: null,
  identifiers: [{ id: 1, kind: 'email', value_normalized: 'alex@example.cy' }, { id: 2, kind: 'phone', value_normalized: '+35799123456' }],
  roles: [], contacts: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

afterEach(() => vi.unstubAllGlobals())

describe('mappers', () => {
  it('org hit: label is the name, subLabel tells same names apart (legal name, city, category, number)', () => {
    expect(orgHitToItem(bakeryNic)).toEqual({ value: '41', label: 'Alpha Bakery', subLabel: 'Alpha Bakery Ltd · Nicosia · bakery · #41' })
  })

  it('org hit with nulls and legal name equal to name', () => {
    const hit: OrgHit = { id: 7, name: 'Solo', legal_name: 'Solo', city: null, category: null, business_status: 'unknown' }
    expect(orgHitToItem(hit)).toEqual({ value: '7', label: 'Solo', subLabel: '#7' })
    expect(orgHitToItem({ ...hit, legal_name: null })).toEqual({ value: '7', label: 'Solo', subLabel: '#7' })
  })

  it('person: label name, subLabel identifiers and number; nameless person gets a dash', () => {
    expect(personToItem(person as never)).toEqual({ value: '17', label: 'Alex', subLabel: 'alex@example.cy · +35799123456 · #17' })
    expect(personToItem({ ...person, display_name: null, identifiers: [] } as never)).toEqual({ value: '17', label: '—', subLabel: '#17' })
  })
})

describe('searchCrmOrgs', () => {
  it('done: 200 with hits -> items, request goes through the proxy with encoded query and limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [bakeryNic], total: 1, limit: 20, offset: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    const items = await searchCrmOrgs('  Alpha & Co ')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/crm/orgs?q=Alpha%20%26%20Co&limit=20')
    expect(items.map((i) => i.label)).toEqual(['Alpha Bakery'])
  })

  it('empty: 200 with no items -> [] (not an error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [], total: 0, limit: 20, offset: 0 })))
    expect(await searchCrmOrgs('zzzz')).toEqual([])
  })

  it('no request below the minimum length', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchCrmOrgs('a')).toEqual([])
    expect(await searchCrmOrgs('  a ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(ORG_SEARCH_MIN).toBe(2)
  })

  it.each([[500], [502], [403]])('failed: status %i -> CrmSearchError', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'x' }, status)))
    await expect(searchCrmOrgs('ab')).rejects.toMatchObject({ status })
  })

  it('failed: network error -> CrmSearchError status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(searchCrmOrgs('ab')).rejects.toMatchObject({ status: 0 })
  })

  it('422 keeps the detail code; a validation list or object detail has no code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'org_search_too_short' }, 422)))
    await expect(searchCrmOrgs('ab')).rejects.toMatchObject({ status: 422, code: 'org_search_too_short' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: [{ loc: ['query', 'q'], msg: 'x' }] }, 422)))
    await expect(searchCrmOrgs('ab')).rejects.toMatchObject({ status: 422, code: undefined })
  })
})

describe('searchCrmPersons', () => {
  it('done: hits -> items; below 3 characters no request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [person], total: 1, limit: 20, offset: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchCrmPersons('ab')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    const items = await searchCrmPersons('alex')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/crm/persons?q=alex&limit=20')
    expect(items[0].label).toBe('Alex')
    expect(PERSON_SEARCH_MIN).toBe(3)
  })
})

describe('searchErrorText', () => {
  it('maps the status/code to a translated text, never the raw code', () => {
    expect(searchErrorText(new CrmSearchError(403), tr)).toBe(tr.crm_err_forbidden)
    expect(searchErrorText(new CrmSearchError(422, 'org_search_too_short'), tr)).toBe('Enter at least 2 characters to search.')
    expect(searchErrorText(new CrmSearchError(422, 'person_search_too_short'), tr)).toBe(tr.crm_err_person_search_too_short)
    expect(searchErrorText(new CrmSearchError(500), tr)).toBe('Search failed. Please try again.')
    expect(searchErrorText(new CrmSearchError(502), tr)).toBe('Search failed. Please try again.')
    expect(searchErrorText(new CrmSearchError(0), tr)).toBe('Search failed. Please try again.')
  })

  it('unknown code and foreign errors fall back to the generic search text', () => {
    expect(searchErrorText(new CrmSearchError(422, 'something_new'), tr)).toBe(tr.crm_err_search_failed)
    expect(searchErrorText(new Error('boom'), tr)).toBe(tr.crm_err_search_failed)
  })

  it('Greek texts exist for the new keys', () => {
    const el = tSysAdmin('el')
    expect(searchErrorText(new CrmSearchError(422, 'org_search_too_short'), el)).toBe('Εισαγάγετε τουλάχιστον 2 χαρακτήρες για αναζήτηση.')
    expect(el.crm_org_search_placeholder).toBe('Αναζήτηση οργανισμού…')
    expect(el.crm_search_min_chars.replace('{n}', '2')).toBe('Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες')
    expect(el.no_results).toBe('Δεν βρέθηκαν αποτελέσματα')
  })

  it('org_search_too_short is mapped', () => {
    expect(CRM_ERROR_KEYS.org_search_too_short).toBe('crm_err_org_search_too_short')
  })
})
