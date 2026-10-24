import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonRoleEditor } from '@/components/system-admin/crm/PersonRoleEditor'
import { PersonEditForm } from '@/components/system-admin/crm/PersonEditForm'
import { ContactPersonLink } from '@/components/system-admin/crm/ContactPersonLink'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { CrmPerson } from '@/types/system-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const tr = tSysAdmin('en')
const person: CrmPerson = {
  id: 17,
  display_name: 'Alex',
  address_id: null,
  identifiers: [{ id: 1, kind: 'email', value_normalized: 'alex@example.cy' }],
  roles: [{ id: 9, org_id: 22, org_name: 'Alpha Bakery', org_city: 'Nicosia', role: 'owner', valid_from: '2026-01-01', valid_to: null, source: 'manual' }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); vi.useRealTimers() })

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const orgPage = (...items: Array<Record<string, unknown>>) => json({ items, total: items.length, limit: 20, offset: 0 })
const ALPHA = { id: 41, name: 'Alpha Bakery', legal_name: null, city: 'Nicosia', category: 'bakery', business_status: 'unknown' }
const ALPHA_LIM = { ...ALPHA, id: 42, city: 'Limassol' }

/** fetch mock: searches answer from `search`, every other call (POST) from `rest` */
function stubFetch(search: () => Response | Promise<Response>, rest: () => Response = () => json({ id: 1 })) {
  const mock = vi.fn((url: string) => Promise.resolve(url.includes('?q=') ? search() : rest()))
  vi.stubGlobal('fetch', mock)
  return mock
}
const searchCalls = (mock: ReturnType<typeof stubFetch>) => mock.mock.calls.filter(([u]) => String(u).includes('?q='))

const hits = () => within(screen.getByRole('listbox')).getAllByRole('option')

/** opens the Combobox with the given id, types and lets the 250 ms debounce pass */
async function openAndType(id: string, searchName: string, text: string) {
  fireEvent.click(document.getElementById(id)!)
  fireEvent.change(screen.getByRole('textbox', { name: searchName }), { target: { value: text } })
  await act(async () => { await vi.advanceTimersByTimeAsync(260) })
}

describe('CRM person UI', () => {
  it('ends an active role through the scoped person endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 9, valid_to: '2026-10-24' }))))
    render(<PersonRoleEditor person={person} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: 'End role' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/crm/persons/17/roles/9/end', expect.objectContaining({ method: 'POST' })))
    expect(refresh).toHaveBeenCalled()
  })

  it('removes an address through the explicit null PATCH contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 17, address_id: null }))))
    render(<PersonEditForm person={{ ...person, address_id: 4, address: { id: 4, address_line1: 'Main 1', address_line2: null, city: 'Nicosia', state: null, postal_code: '1010', country_code: 'CY', lat: null, lon: null } }} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove address' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/crm/persons/17', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ address: null }) })))
    expect(refresh).toHaveBeenCalled()
  })
})

describe('PersonRoleEditor: organisation search', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('lists roles with the organisation name (and city); an ended role shows name and end date', () => {
    const ended = { id: 10, org_id: 23, org_name: 'Beta Cafe', org_city: null, role: 'it', valid_from: '2025-01-01', valid_to: '2025-12-31', source: 'manual' }
    render(<PersonRoleEditor person={{ ...person, roles: [...person.roles, ended] }} tr={tr} />)
    expect(screen.getByText('owner · Alpha Bakery (Nicosia) · 2026-01-01 – —')).toBeDefined()
    expect(screen.getByText('it · Beta Cafe · 2025-01-01 – 2025-12-31')).toBeDefined()
    expect(screen.queryByText(/Organisation #/)).toBeNull()
  })

  it('falls back to "Organisation #id" when the name is empty', () => {
    render(<PersonRoleEditor person={{ ...person, roles: [{ ...person.roles[0], org_name: '', org_city: null }] }} tr={tr} />)
    expect(screen.getByText('owner · Organisation #22 · 2026-01-01 – —')).toBeDefined()
  })

  it('has no ID field; Add role is disabled until a hit is chosen', () => {
    const { container } = render(<PersonRoleEditor person={person} tr={tr} />)
    expect(container.querySelector('input[inputmode="numeric"]')).toBeNull()
    expect(container.querySelector('input[type="text"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add role' })).toBeDisabled()
    expect(screen.getByText('Search organisation…')).toBeDefined()
  })

  it('choosing a hit and Add role posts the numeric org_id of that hit and refreshes', async () => {
    const mock = stubFetch(() => orgPage(ALPHA, ALPHA_LIM))
    render(<PersonRoleEditor person={person} tr={tr} />)
    await openAndType('person-org', 'Organisation', 'alp')
    expect(hits().map((o) => o.textContent)).toEqual(['Alpha BakeryNicosia · bakery · #41', 'Alpha BakeryLimassol · bakery · #42'])
    fireEvent.click(hits()[1])
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'owner' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    const post = (mock.mock.calls as unknown as Array<[string, RequestInit]>).find(([u]) => u === '/api/admin/crm/persons/17/roles')!
    expect(JSON.parse(post[1].body as string)).toEqual({ org_id: 42, role: 'owner' })
    expect(refresh).toHaveBeenCalled()
  })

  it('under 2 characters: hint, no request', async () => {
    const mock = stubFetch(() => orgPage())
    render(<PersonRoleEditor person={person} tr={tr} />)
    await openAndType('person-org', 'Organisation', 'a')
    expect(screen.getByText('Type at least 2 characters')).toBeDefined()
    expect(searchCalls(mock)).toHaveLength(0)
  })

  it('no hit shows "No results" and keeps Add role disabled', async () => {
    stubFetch(() => orgPage())
    render(<PersonRoleEditor person={person} tr={tr} />)
    await openAndType('person-org', 'Organisation', 'zzzz')
    expect(screen.getByText('No results')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Add role' })).toBeDisabled()
  })

  it.each([
    [500, 'Search failed. Please try again.'],
    [502, 'Search failed. Please try again.'],
    [403, 'Permission denied for this action.'],
  ])('search answers %i -> readable error instead of "No results"', async (status, text) => {
    stubFetch(() => json({ detail: 'x' }, status))
    render(<PersonRoleEditor person={person} tr={tr} />)
    await openAndType('person-org', 'Organisation', 'alp')
    expect(screen.getByRole('alert').textContent).toBe(text)
    expect(screen.queryByText('No results')).toBeNull()
  })

  it('network error -> error text; the next input searches again', async () => {
    const mock = vi.fn().mockRejectedValueOnce(new TypeError('down')).mockResolvedValueOnce(orgPage(ALPHA))
    vi.stubGlobal('fetch', mock)
    render(<PersonRoleEditor person={person} tr={tr} />)
    await openAndType('person-org', 'Organisation', 'alp')
    expect(screen.getByRole('alert').textContent).toBe('Search failed. Please try again.')
    fireEvent.change(screen.getByRole('textbox', { name: 'Organisation' }), { target: { value: 'alph' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
    expect(screen.getByText('Alpha Bakery')).toBeDefined()
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('debounce: one request 250 ms after the last keystroke', async () => {
    const mock = stubFetch(() => orgPage(ALPHA))
    render(<PersonRoleEditor person={person} tr={tr} />)
    fireEvent.click(document.getElementById('person-org')!)
    const field = screen.getByRole('textbox', { name: 'Organisation' })
    fireEvent.change(field, { target: { value: 'al' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    fireEvent.change(field, { target: { value: 'alp' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(249) })
    expect(searchCalls(mock)).toHaveLength(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(searchCalls(mock)).toHaveLength(1)
    expect(String(searchCalls(mock)[0][0])).toBe('/api/admin/crm/orgs?q=alp&limit=20')
  })

  it('without write permission neither the form nor "End role" is rendered', () => {
    const { container } = render(<PersonRoleEditor person={person} tr={tr} canWrite={false} />)
    expect(container.querySelector('#person-org')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add role' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'End role' })).toBeNull()
    expect(screen.getByText('owner · Alpha Bakery (Nicosia) · 2026-01-01 – —')).toBeDefined()
  })

  it('Greek: placeholder, hint and empty text', async () => {
    stubFetch(() => orgPage())
    const el = tSysAdmin('el')
    render(<PersonRoleEditor person={person} tr={el} />)
    expect(screen.getByText('Αναζήτηση οργανισμού…')).toBeDefined()
    fireEvent.click(document.getElementById('person-org')!)
    expect(screen.getByText('Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες')).toBeDefined()
    fireEvent.change(screen.getByRole('textbox', { name: 'Οργανισμός' }), { target: { value: 'zzzz' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
    expect(screen.getByText('Δεν βρέθηκαν αποτελέσματα')).toBeDefined()
  })
})

describe('ContactPersonLink: person search', () => {
  beforeEach(() => { vi.useFakeTimers() })
  const hit = { ...person, id: 17, display_name: 'Alex' }

  it('under 3 characters: hint, no request, the backend code is nowhere in the DOM', async () => {
    const mock = stubFetch(() => json({ items: [], total: 0, limit: 20, offset: 0 }))
    const { container } = render(<ContactPersonLink contactId={3} personId={null} canWrite tr={tr} />)
    await openAndType('crm-person-search', 'Person', 'ab')
    expect(screen.getByText('Type at least 3 characters')).toBeDefined()
    expect(searchCalls(mock)).toHaveLength(0)
    expect(container.textContent).not.toContain('person_search_too_short')
  })

  it('shows name and e-mail of the hit; choosing it and "Link person" posts the person/contact pair and refreshes', async () => {
    const mock = stubFetch(() => json({ items: [hit], total: 1, limit: 20, offset: 0 }))
    render(<ContactPersonLink contactId={3} personId={null} canWrite tr={tr} />)
    expect(screen.getByRole('button', { name: 'Link person' })).toBeDisabled()
    await openAndType('crm-person-search', 'Person', 'alex')
    expect(screen.getByText('alex@example.cy · #17')).toBeDefined()
    fireEvent.click(hits()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Link person' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(mock).toHaveBeenCalledWith('/api/admin/crm/persons/17/contacts/3', expect.objectContaining({ method: 'POST' }))
    expect(refresh).toHaveBeenCalled()
  })

  it('search error 500 shows the error text and the form stays usable', async () => {
    const mock = vi.fn().mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ items: [hit], total: 1, limit: 20, offset: 0 }))
    vi.stubGlobal('fetch', mock)
    render(<ContactPersonLink contactId={3} personId={null} canWrite tr={tr} />)
    await openAndType('crm-person-search', 'Person', 'alex')
    expect(screen.getByRole('alert').textContent).toBe('Search failed. Please try again.')
    fireEvent.change(screen.getByRole('textbox', { name: 'Person' }), { target: { value: 'alex@' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
    expect(screen.getByText('Alex')).toBeDefined()
  })

  it('linked: shows "Linked person: <name>", or "#id" without a name', () => {
    const { unmount } = render(<ContactPersonLink contactId={3} personId={17} personName="Alex" canWrite tr={tr} />)
    expect(screen.getByRole('link', { name: 'Linked person: Alex' }).getAttribute('href')).toBe('/admin/crm/persons/17')
    unmount()
    render(<ContactPersonLink contactId={3} personId={17} canWrite tr={tr} />)
    expect(screen.getByRole('link', { name: 'Linked person: #17' })).toBeDefined()
  })

  it('without write permission and without a person nothing is rendered', () => {
    const { container } = render(<ContactPersonLink contactId={3} personId={null} canWrite={false} tr={tr} />)
    expect(container.innerHTML).toBe('')
  })
})
