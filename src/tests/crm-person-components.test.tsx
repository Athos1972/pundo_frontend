// F7600 CRM-Backbone, org cut, T16: person components (PersonForm, PersonEditForm, PersonRelationEditor, OrgRelationList).
// Backend answers are the recorded files of the slot backend (e2e/fixtures/contracts/crm-persons, R1); the assertions
// check the effect: the request body the backend receives, the rendered text, the refresh after a change.
// ChannelEditor (T15) is replaced by a stub that exposes its props: here only the wiring (owner, person, rights) counts.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonForm } from '@/components/system-admin/crm/PersonForm'
import { PersonEditForm } from '@/components/system-admin/crm/PersonEditForm'
import { PersonRelationEditor, todayIso } from '@/components/system-admin/crm/PersonRelationEditor'
import { OrgRelationList } from '@/components/system-admin/crm/OrgRelationList'
import { showToast } from '@/components/system-admin/Toast'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { rec, recorded, type Recorded } from './helpers/crm-person-recorded'
import type { CrmPerson } from '@/types/system-admin'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))
vi.mock('@/components/system-admin/crm/ChannelEditor', () => ({
  ChannelEditor: (props: Record<string, unknown>) => React.createElement('div', {
    'data-testid': 'channel-editor',
    'data-props': JSON.stringify(props, (key, value) => (key === 'tr' || typeof value === 'function' ? undefined : value)),
  }),
}))

const en = tSysAdmin('en')
const el = tSysAdmin('el')

afterEach(() => { vi.unstubAllGlobals(); push.mockReset(); refresh.mockReset(); vi.mocked(showToast).mockReset(); vi.useRealTimers() })

// ─── fetch helpers ────────────────────────────────────────────────────────────────────────────────────────────────
type Route = [method: string, url: string | RegExp, answer: () => Response]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const from = (file: Recorded<unknown>) => () => json(file.body, file.status)

function stubFetch(routes: Route[]) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const hit = routes.find(([m, u]) => m === method && (typeof u === 'string' ? u === url : u.test(url)))
    return hit ? hit[2]() : json({ detail: `unmocked ${method} ${url}` }, 599)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}
type Call = [string, RequestInit | undefined]
const calls = (mock: ReturnType<typeof stubFetch>, method: string, url?: string) =>
  (mock.mock.calls as unknown as Call[]).filter(([u, i]) => (i?.method ?? 'GET') === method && (url === undefined || u === url))
const sentBody = (mock: ReturnType<typeof stubFetch>, method: string, url: string) => {
  const hit = calls(mock, method, url)
  expect(hit, `${method} ${url} was not called`).toHaveLength(1)
  return JSON.parse(String(hit[0][1]!.body))
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
const editorProps = () => screen.getAllByTestId('channel-editor').map((node) => JSON.parse(node.getAttribute('data-props')!))

// ─── recorded error bodies of the person/relation routes ──────────────────────────────────────────────────────────
describe('recorded conflict answers keep the shape the person components read', () => {
  it.each([
    ['person-channel-exists', 409, 'person_channel_exists', 'person_id'],
    ['relation-channel-owned-by-org', 422, 'channel_owned_by_org', 'channel_id'],
    ['relation-channel-exists-same-person', 409, 'channel_exists_same_person', 'channel_id'],
    ['relation-role-exists', 409, 'relation_role_exists', null],
    ['person-display-name-derived', 422, 'person_display_name_derived', null],
    ['person-birth-date-invalid', 422, 'person_birth_date_invalid', null],
  ])('%s: %i %s with its extra field, mapped to a text (EN and EL)', async (name, status, code, extra) => {
    const { CRM_ERROR_KEYS } = await import('@/components/system-admin/crm/crmFetch')
    const file = recorded<{ detail: string | Record<string, unknown> }>(name)
    expect(file.status).toBe(status)
    const detail = file.body.detail
    const actual = typeof detail === 'string' ? detail : detail.detail
    expect(actual).toBe(code)
    if (extra) expect(typeof (detail as Record<string, unknown>)[extra]).toBe('number')
    const key = (CRM_ERROR_KEYS as Record<string, keyof typeof en>)[code]
    expect(key).toBeDefined()
    expect(en[key]).toBeTruthy()
    expect(el[key]).not.toBe(en[key])
  })
})

// ─── PersonForm ───────────────────────────────────────────────────────────────────────────────────────────────────
describe('PersonForm', () => {
  it('first and last name: "Name" is read-only with the derived preview; the POST sends the parts, never display_name', async () => {
    const created = recorded<CrmPerson>('person-create-derived')
    const mock = stubFetch([['POST', '/api/admin/crm/persons', from(created)]])
    render(<PersonForm tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: ' Maria ' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Georgiou' } })
    const name = screen.getByLabelText('Name') as HTMLInputElement
    expect(name.value).toBe('Maria Georgiou')
    expect(name.readOnly).toBe(true)
    expect(screen.getByText(en.crm_person_name_derived_hint)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.crm_person_new }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/crm/persons/${created.body.id}`))
    const body = sentBody(mock, 'POST', '/api/admin/crm/persons')
    expect(body).toEqual({ first_name: 'Maria', last_name: 'Georgiou', salutation: null, channels: [], address: null })
    expect(body).not.toHaveProperty('display_name')
  })

  it('only a last name: the preview has no leading space (AC 30)', () => {
    render(<PersonForm tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Georgiou' } })
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Georgiou')
  })

  it('free name, salutation, birthday 29 Feb with year unknown and a personal mail are sent as the backend expects', async () => {
    const mock = stubFetch([['POST', '/api/admin/crm/persons', from(recorded('person-create-free'))]])
    render(<PersonForm tr={en} lang="en" />)
    const name = screen.getByLabelText('Name') as HTMLInputElement
    expect(name.readOnly).toBe(false)
    fireEvent.change(name, { target: { value: 'Γεωργίου Ελένη' } })
    fireEvent.change(screen.getByLabelText('Salutation'), { target: { value: 'ms' } })
    fireEvent.click(screen.getByLabelText('Year unknown'))
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '29' } })
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(en.crm_form_email), { target: { value: 'eleni@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: en.crm_person_new }))
    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(sentBody(mock, 'POST', '/api/admin/crm/persons')).toEqual({
      display_name: 'Γεωργίου Ελένη', salutation: 'ms', birth_date: '2000-02-29', birth_year_unknown: true,
      channels: [{ kind: 'email', value: 'eleni@example.test' }], address: null,
    })
  })

  it('salutation offers "not set" plus the five catalog values, translated', () => {
    render(<PersonForm tr={el} lang="el" />)
    const options = Array.from((screen.getByLabelText('Προσφώνηση') as HTMLSelectElement).options).map((o) => [o.value, o.textContent])
    expect(options).toEqual([['', el.crm_salutation_unset], ['mr', 'Κος'], ['ms', 'Κα'], ['mx', el.crm_salutation_mx], ['dr', 'Δρ'], ['none', el.crm_salutation_none]])
  })

  it('without any name the button stays disabled and says why', () => {
    const mock = stubFetch([])
    render(<PersonForm tr={en} lang="en" />)
    expect(screen.getByRole('button', { name: en.crm_person_new })).toBeDisabled()
    expect(screen.getByText(en.crm_person_name_required)).toBeTruthy()
    expect(mock).not.toHaveBeenCalled()
  })

  it('an impossible birthday blocks the submit', () => {
    render(<PersonForm tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'X Y' } })
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '31' } })
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1990' } })
    expect(screen.getByRole('button', { name: en.crm_person_new })).toBeDisabled()
  })

  it('409 person_channel_exists (recorded): link to the person who owns the value, no navigation', async () => {
    const conflict = recorded<{ detail: { person_id: number } }>('person-channel-exists')
    stubFetch([['POST', '/api/admin/crm/persons', from(conflict)]])
    render(<PersonForm tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Duplicate' } })
    fireEvent.change(screen.getByLabelText(en.crm_form_email), { target: { value: 'taken@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: en.crm_person_new }))
    const link = await screen.findByRole('link', { name: en.crm_person_open_existing })
    expect(link.getAttribute('href')).toBe(`/admin/crm/persons/${conflict.body.detail.person_id}`)
    expect(push).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(en.crm_err_person_channel_exists, 'error')
  })
})

// ─── PersonEditForm ───────────────────────────────────────────────────────────────────────────────────────────────
describe('PersonEditForm', () => {
  const patchUrl = (person: CrmPerson) => `/api/admin/crm/persons/${person.id}`

  it('splitting a free name: notice, then a confirm dialog; the PATCH (parts only) is sent after "Replace name" (AC 32)', async () => {
    const person = rec.personFree()
    const mock = stubFetch([['PATCH', patchUrl(person), from(recorded('person-patch-derive'))]])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    expect((screen.getByLabelText('Name') as HTMLInputElement).readOnly).toBe(false)
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ελένη' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Γεωργίου' } })
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ελένη Γεωργίου')
    expect(screen.getByText('Saving replaces the current name "Γεωργίου Ελένη" with "Ελένη Γεωργίου".')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('The current name "Γεωργίου Ελένη" will be replaced by "Ελένη Γεωργίου".')
    expect(mock).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: en.crm_person_name_replace_ok }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', patchUrl(person))).toEqual({ first_name: 'Ελένη', last_name: 'Γεωργίου' })
  })

  it('"Cancel" in the dialog sends nothing', () => {
    const person = rec.personFree()
    const mock = stubFetch([])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ελένη' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: en.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mock).not.toHaveBeenCalled()
  })

  it('derived name: "Name" is read-only; changing only the salutation sends only the salutation (no display_name)', async () => {
    const person = rec.personDetail()
    const mock = stubFetch([['PATCH', patchUrl(person), from(recorded('person-detail'))]])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    expect((screen.getByLabelText('Name') as HTMLInputElement).readOnly).toBe(true)
    expect(screen.getByRole('button', { name: en.save })).toBeDisabled()       // nothing changed yet
    fireEvent.change(screen.getByLabelText('Salutation'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sentBody(mock, 'PATCH', patchUrl(person))).toEqual({ salutation: null })
  })

  it('way back: clearing both parts makes "Name" editable with the last derived name; display_name is not sent unchanged', async () => {
    const person = rec.personDetail()
    const mock = stubFetch([['PATCH', patchUrl(person), from(recorded('person-detail'))]])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: ' ' } })
    const name = screen.getByLabelText('Name') as HTMLInputElement
    expect(name.readOnly).toBe(false)
    expect(name.value).toBe(person.display_name)
    expect(screen.getByText(en.crm_person_name_free_hint)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', patchUrl(person))).toEqual({ first_name: null, last_name: null })
  })

  it('the recorded birthday (29 Feb, year unknown) is loaded without a year; entering a known year sends the full date', async () => {
    const person = rec.personDetail()
    const mock = stubFetch([['PATCH', patchUrl(person), from(recorded('person-detail'))]])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    expect((screen.getByLabelText('Year unknown') as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByLabelText('Year')).toBeNull()
    expect((screen.getByLabelText('Day') as HTMLInputElement).value).toBe('29')
    fireEvent.click(screen.getByLabelText('Year unknown'))
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1988' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', patchUrl(person))).toEqual({ birth_date: '1988-02-29', birth_year_unknown: false })
  })

  it('removes the address through the explicit null PATCH', async () => {
    const person: CrmPerson = { ...rec.personFree(), address: { id: 4, address_line1: 'Main 1', address_line2: null, city: 'Nicosia', state: null, postal_code: '1010', country_code: 'CY', lat: null, lon: null } }
    const mock = stubFetch([['PATCH', patchUrl(person), from(recorded('person-create-free'))]])
    render(<PersonEditForm person={person} tr={en} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: en.crm_person_remove_address }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', patchUrl(person))).toEqual({ address: null })
  })
})

// ─── PersonRelationEditor ─────────────────────────────────────────────────────────────────────────────────────────
describe('PersonRelationEditor', () => {
  const setup = (canWrite = true) => {
    const person = rec.personDetail()
    const org = rec.orgDetail()
    const active = person.relations.find((relation) => relation.active)!
    const ended = person.relations.find((relation) => !relation.active)!
    render(<PersonRelationEditor person={person} orgChannels={{ [org.id]: org.channels }} tr={en} canWrite={canWrite} canSetTier />)
    return { person, org, active, ended, activeCard: screen.getByTestId(`relation-${active.id}`), endedCard: screen.getByTestId(`relation-${ended.id}`) }
  }

  it('active relation first: organisation link, translated roles, note, period, organisation address, preferred org channel', () => {
    stubFetch([])
    const { org, active, ended, activeCard, endedCard } = setup()
    const cards = screen.getAllByTestId(/^relation-\d+$/)
    expect(cards.map((card) => card.dataset.testid)).toEqual([`relation-${active.id}`, `relation-${ended.id}`])
    expect(within(activeCard).getByRole('link', { name: `${active.org.name} (${active.org.city})` }).getAttribute('href')).toBe(`/admin/crm/orgs/${active.org.id}`)
    expect(within(activeCard).getByText('Manager')).toBeTruthy()
    expect(within(activeCard).getByText('Accountant')).toBeTruthy()
    expect(within(activeCard).queryByText(en.crm_relation_role_missing)).toBeNull()
    expect(activeCard.textContent).toContain('Note: Region West')
    expect(activeCard.textContent).toContain('Period: — – —')
    expect(activeCard.textContent).toContain(`${en.crm_relation_work_location}: ${en.crm_relation_uses_org_address}`)
    const preferred = within(activeCard).getByLabelText(en.crm_relation_preferred) as HTMLSelectElement
    expect(preferred.value).toBe(String(active.preferred_channel_id))
    expect(preferred.selectedOptions[0].textContent).toBe(`${org.channels[0].value_normalized} (Organisation)`)
    expect(endedCard.textContent).toContain(en.crm_relation_ended)
    expect(endedCard.textContent).toContain(`Period: ${ended.valid_from} – ${ended.valid_to}`)
    expect(within(endedCard).getByText('Owner')).toBeTruthy()
  })

  it('ended relation is history: no role, preferred-channel, end or edit controls', () => {
    stubFetch([])
    const { endedCard } = setup()
    expect(within(endedCard).queryByRole('button')).toBeNull()
    expect(within(endedCard).queryByRole('combobox')).toBeNull()
  })

  it('relation channels go to the owner-neutral ChannelEditor with relation owner, person and move targets', () => {
    stubFetch([])
    const { person, active, ended } = setup()
    const byOwner = Object.fromEntries(editorProps().map((props) => [props.owner.id, props]))
    expect(byOwner[active.id]).toMatchObject({
      owner: { type: 'relation', id: active.id }, personId: person.id, canWrite: true, canSetTier: true,
      channels: active.channels,
      moveTargets: [
        { owner: { type: 'person', id: person.id }, label: `Personal channel of ${person.display_name}` },
        { owner: { type: 'org', id: active.org.id }, label: `${active.org.name} (Organisation)` },
      ],
    })
    expect(byOwner[ended.id]).toMatchObject({ owner: { type: 'relation', id: ended.id }, canWrite: false, canSetTier: false })
  })

  it('removing a role is a DELETE of that role; adding one a POST; both refresh', async () => {
    const mock = stubFetch([])
    const { active, activeCard } = setup()
    const routes = stubFetch([
      ['DELETE', `/api/admin/crm/relations/${active.id}/roles/manager`, from(recorded('relation-create'))],
      ['POST', `/api/admin/crm/relations/${active.id}/roles`, from(recorded('relation-create'))],
    ])
    expect(mock).not.toHaveBeenCalled()
    fireEvent.click(within(activeCard).getByRole('button', { name: 'Remove role Manager' }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(calls(routes, 'DELETE', `/api/admin/crm/relations/${active.id}/roles/manager`)).toHaveLength(1)
    const roleSelect = within(activeCard).getByLabelText(en.crm_person_role) as HTMLSelectElement
    expect(Array.from(roleSelect.options).map((o) => o.value)).not.toContain('manager')
    fireEvent.change(roleSelect, { target: { value: 'owner' } })
    fireEvent.click(within(activeCard).getByRole('button', { name: en.crm_relation_role_add }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
    expect(sentBody(routes, 'POST', `/api/admin/crm/relations/${active.id}/roles`)).toEqual({ role: 'owner' })
  })

  it('409 relation_role_exists (recorded) shows the translated text and does not refresh', async () => {
    stubFetch([])
    const { active, activeCard } = setup()
    stubFetch([['POST', `/api/admin/crm/relations/${active.id}/roles`, from(recorded('relation-role-exists'))]])
    fireEvent.change(within(activeCard).getByLabelText(en.crm_person_role), { target: { value: 'it' } })
    fireEvent.click(within(activeCard).getByRole('button', { name: en.crm_relation_role_add }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(en.crm_err_relation_role_exists, 'error'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('preferred channel: "none" sends an explicit null', async () => {
    stubFetch([])
    const { active, activeCard } = setup()
    const mock = stubFetch([['PATCH', `/api/admin/crm/relations/${active.id}`, from(recorded('relation-create'))]])
    fireEvent.change(within(activeCard).getByLabelText(en.crm_relation_preferred), { target: { value: '' } })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', `/api/admin/crm/relations/${active.id}`)).toEqual({ preferred_channel_id: null })
  })

  it('the preferred channel offers relation, personal and organisation channels with their owner', () => {
    stubFetch([])
    const { org, active, activeCard } = setup()
    const options = Array.from((within(activeCard).getByLabelText(en.crm_relation_preferred) as HTMLSelectElement).options).map((o) => o.textContent)
    expect(options).toEqual([
      en.crm_relation_preferred_none,
      `${active.channels[0].value_normalized} (Relation)`,
      `${active.person_channels[0].value_normalized} (Personal)`,
      `${org.channels[0].value_normalized} (Organisation)`,
    ])
  })

  it('"End relation" asks first and then ends it today', async () => {
    stubFetch([])
    const { active, activeCard } = setup()
    const mock = stubFetch([['POST', `/api/admin/crm/relations/${active.id}/end`, from(recorded('relation-create-ended'))]])
    fireEvent.click(within(activeCard).getByRole('button', { name: en.crm_relation_end }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain(en.crm_relation_end_confirm)
    expect(mock).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: en.crm_relation_end }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'POST', `/api/admin/crm/relations/${active.id}/end`)).toEqual({ valid_to: todayIso() })
  })

  it('edit period, note and work location: only changed fields; a different work location sends an address', async () => {
    stubFetch([])
    const { active, activeCard } = setup()
    const mock = stubFetch([['PATCH', `/api/admin/crm/relations/${active.id}`, from(recorded('relation-create'))]])
    fireEvent.click(within(activeCard).getByRole('button', { name: en.crm_relation_edit }))
    fireEvent.change(within(activeCard).getByLabelText(en.crm_relation_valid_from), { target: { value: '2026-01-01' } })
    fireEvent.change(within(activeCard).getByLabelText(en.crm_relation_note), { target: { value: 'Region West, until 2025 also IT' } })
    fireEvent.click(within(activeCard).getByLabelText(en.crm_relation_own_address))
    fireEvent.change(within(activeCard).getByLabelText(en.crm_form_city), { target: { value: 'Paphos' } })
    fireEvent.click(within(activeCard).getByRole('button', { name: en.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(sentBody(mock, 'PATCH', `/api/admin/crm/relations/${active.id}`)).toEqual({
      valid_from: '2026-01-01', note: 'Region West, until 2025 also IT',
      address: { address_line1: null, city: 'Paphos', postal_code: null, country_code: 'CY' },
    })
  })

  it('without write permission: no form, no role, end or edit controls; the content stays visible', () => {
    stubFetch([])
    const { activeCard } = setup(false)
    expect(document.getElementById('person-org')).toBeNull()
    expect(screen.queryByRole('button', { name: en.crm_relation_add })).toBeNull()
    expect(within(activeCard).queryByRole('button')).toBeNull()
    expect(within(activeCard).getByText('Manager')).toBeTruthy()
    expect(within(activeCard).getByText(`${rec.orgDetail().channels[0].value_normalized} (Organisation)`).tagName).toBe('SPAN')
  })

  it('no relation: empty text', () => {
    stubFetch([])
    render(<PersonRelationEditor person={rec.personFree()} tr={en} />)
    expect(screen.getByText(en.crm_person_no_relations)).toBeTruthy()
  })
})

describe('PersonRelationEditor: new relation with organisation search', () => {
  beforeEach(() => { vi.useFakeTimers() })
  const orgHit = (id: number, city: string) => ({ id, name: 'Alpha Bakery', legal_name: null, city, category: 'bakery', business_status: 'unknown', has_parent: false, child_count: 0 })
  const page = (...items: unknown[]) => () => json({ items, total: items.length, limit: 20, offset: 0 })

  async function openAndType(text: string, name = 'Organisation') {
    fireEvent.click(document.getElementById('person-org')!)
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value: text } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
  }
  const hits = () => within(screen.getByRole('listbox')).getAllByRole('option')

  it('choose a hit, no role (allowed, E22), note -> POST /relations with the numeric ids and an empty role set', async () => {
    const person = rec.personFree()
    const mock = stubFetch([
      ['GET', /^\/api\/admin\/crm\/orgs\/search\?/, page(orgHit(41, 'Nicosia'), orgHit(42, 'Limassol'))],
      ['POST', '/api/admin/crm/relations', from(recorded('relation-create-without-role'))],
    ])
    render(<PersonRelationEditor person={person} tr={en} />)
    expect(screen.getByRole('button', { name: en.crm_relation_add })).toBeDisabled()
    await openAndType('alp')
    expect(hits().map((o) => o.textContent)).toEqual(['Alpha BakeryNicosia · bakery · #41', 'Alpha BakeryLimassol · bakery · #42'])
    fireEvent.click(hits()[1])
    fireEvent.change(screen.getByLabelText(en.crm_relation_note), { target: { value: 'Region West' } })
    fireEvent.click(screen.getByRole('button', { name: en.crm_relation_add }))
    await flush()
    expect(sentBody(mock, 'POST', '/api/admin/crm/relations')).toEqual({ person_id: person.id, org_id: 42, roles: [], note: 'Region West' })
    expect(refresh).toHaveBeenCalled()
  })

  it('several roles are sent as a set', async () => {
    const person = rec.personFree()
    const mock = stubFetch([
      ['GET', /^\/api\/admin\/crm\/orgs\/search\?/, page(orgHit(41, 'Nicosia'))],
      ['POST', '/api/admin/crm/relations', from(recorded('relation-create'))],
    ])
    render(<PersonRelationEditor person={person} tr={en} />)
    await openAndType('alp')
    fireEvent.click(hits()[0])
    fireEvent.click(screen.getByLabelText('Accountant'))
    fireEvent.click(screen.getByLabelText('IT'))
    fireEvent.click(screen.getByRole('button', { name: en.crm_relation_add }))
    await flush()
    expect(sentBody(mock, 'POST', '/api/admin/crm/relations')).toMatchObject({ org_id: 41, roles: ['accountant', 'it'] })
  })

  it('the search uses /orgs/search after a 250 ms debounce', async () => {
    const mock = stubFetch([['GET', /^\/api\/admin\/crm\/orgs\/search\?/, page(orgHit(41, 'Nicosia'))]])
    render(<PersonRelationEditor person={rec.personFree()} tr={en} />)
    fireEvent.click(document.getElementById('person-org')!)
    const field = screen.getByRole('textbox', { name: 'Organisation' })
    fireEvent.change(field, { target: { value: 'al' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    fireEvent.change(field, { target: { value: 'alp' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(249) })
    expect(calls(mock, 'GET')).toHaveLength(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(calls(mock, 'GET').map(([url]) => url)).toEqual(['/api/admin/crm/orgs/search?q=alp&limit=20'])
  })

  it('under 2 characters: hint, no request', async () => {
    const mock = stubFetch([])
    render(<PersonRelationEditor person={rec.personFree()} tr={en} />)
    await openAndType('a')
    expect(screen.getByText('Type at least 2 characters')).toBeTruthy()
    expect(mock).not.toHaveBeenCalled()
  })

  it.each([
    [500, 'Search failed. Please try again.'],
    [403, 'Permission denied for this action.'],
  ])('search answers %i -> readable error instead of "No results"', async (status, text) => {
    stubFetch([['GET', /^\/api\/admin\/crm\/orgs\/search\?/, () => json({ detail: 'x' }, status)]])
    render(<PersonRelationEditor person={rec.personFree()} tr={en} />)
    await openAndType('alp')
    expect(screen.getByRole('alert').textContent).toBe(text)
    expect(screen.queryByText('No results')).toBeNull()
  })

  it('Greek: placeholder, hint and empty text', async () => {
    stubFetch([['GET', /^\/api\/admin\/crm\/orgs\/search\?/, page()]])
    render(<PersonRelationEditor person={rec.personFree()} tr={el} />)
    expect(screen.getByText('Αναζήτηση οργανισμού…')).toBeTruthy()
    fireEvent.click(document.getElementById('person-org')!)
    expect(screen.getByText('Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Οργανισμός' }), { target: { value: 'zzzz' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
    expect(screen.getByText('Δεν βρέθηκαν αποτελέσματα')).toBeTruthy()
  })
})

// ─── OrgRelationList ──────────────────────────────────────────────────────────────────────────────────────────────
describe('OrgRelationList', () => {
  it('contact persons of the recorded organisation: count, person links, roles or "Role missing", personal channels marked', () => {
    stubFetch([])
    const org = rec.orgDetail()
    render(<OrgRelationList org={org} onChanged={vi.fn()} tr={en} canWrite />)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()       // the page renders the section heading (T14/T15)
    expect(screen.getByText('Active relations: 2')).toBeTruthy()
    const [maria, eleni] = org.relations
    const mariaCard = screen.getByTestId(`relation-${maria.id}`)
    const eleniCard = screen.getByTestId(`relation-${eleni.id}`)
    expect(within(mariaCard).getByRole('link', { name: maria.person.display_name! }).getAttribute('href')).toBe(`/admin/crm/persons/${maria.person.id}`)
    expect(within(mariaCard).getByText('Manager')).toBeTruthy()
    expect(within(mariaCard).getByRole('list', { name: 'Personal' }).textContent).toContain(maria.person_channels[0].value_normalized)
    expect(within(eleniCard).getByText(en.crm_relation_role_missing)).toBeTruthy()
    expect(eleni.roles).toEqual([])
    // preferred channel of Maria points to the org channel (reference, no copy)
    expect((within(mariaCard).getByLabelText(en.crm_relation_preferred) as HTMLSelectElement).selectedOptions[0].textContent)
      .toBe(`${org.channels[0].value_normalized} (Organisation)`)
  })

  it('a change calls onChanged (the page refreshes), not the router of the list', async () => {
    const org = rec.orgDetail()
    const onChanged = vi.fn()
    const maria = org.relations[0]
    stubFetch([['DELETE', `/api/admin/crm/relations/${maria.id}/roles/accountant`, from(recorded('relation-create'))]])
    render(<OrgRelationList org={org} onChanged={onChanged} tr={en} canWrite />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove role Accountant' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('add contact person: person search by name, roles -> POST /relations for this organisation', async () => {
    vi.useFakeTimers()
    const org = rec.orgDetail()
    const onChanged = vi.fn()
    const found = rec.personList().items[0]
    const mock = stubFetch([
      ['GET', /^\/api\/admin\/crm\/persons\?/, from(recorded('person-list'))],
      ['POST', '/api/admin/crm/relations', from(recorded('relation-create'))],
    ])
    render(<OrgRelationList org={org} onChanged={onChanged} tr={en} canWrite />)
    expect(screen.getByRole('button', { name: en.crm_relation_add_person })).toBeDisabled()
    fireEvent.click(document.getElementById('crm-person-search')!)
    fireEvent.change(screen.getByRole('textbox', { name: 'Person' }), { target: { value: 'Maria Geo' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(260) })
    expect(calls(mock, 'GET').map(([url]) => url)).toEqual(['/api/admin/crm/persons?q=Maria%20Geo&limit=20'])
    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[0])
    fireEvent.click(screen.getByLabelText('Owner'))
    fireEvent.click(screen.getByRole('button', { name: en.crm_relation_add_person }))
    await flush()
    expect(sentBody(mock, 'POST', '/api/admin/crm/relations')).toEqual({ person_id: found.id, org_id: org.id, roles: ['owner'] })
    expect(onChanged).toHaveBeenCalled()
  })

  it('without write permission: no add form and no controls in the cards', () => {
    stubFetch([])
    render(<OrgRelationList org={rec.orgDetail()} onChanged={vi.fn()} tr={en} canWrite={false} />)
    expect(document.getElementById('crm-person-search')).toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(editorProps().every((props) => props.canWrite === false)).toBe(true)
  })

  it('no relation: empty text (Greek), no count line', () => {
    stubFetch([])
    render(<OrgRelationList org={{ ...rec.orgDetail(), relations: [] }} onChanged={vi.fn()} tr={el} canWrite />)
    expect(screen.getByText(el.crm_relation_no_contacts)).toBeTruthy()
    expect(screen.queryByText(/Ενεργές σχέσεις/)).toBeNull()
  })
})
