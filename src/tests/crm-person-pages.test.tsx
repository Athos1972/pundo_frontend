// F7600 CRM-Backbone, org cut, T16/T17: person pages and the settings page (Server Components), rendered by calling the
// page function directly (page.route cannot see server fetches). API answers are the recorded slot-backend files
// (e2e/fixtures/contracts/crm-persons); client components are stubs that expose their props.
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { rec } from './helpers/crm-person-recorded'

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': name, 'data-props': JSON.stringify(props, (k, v) => (k === 'tr' ? undefined : v)) }),
}))
class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
vi.mock('next/navigation', () => ({ notFound: () => { throw new NotFoundError() }, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement('a', { href }, children) }))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-api')
vi.mock('@/components/system-admin/crm/PersonEditForm', () => ({ PersonEditForm: stub('PersonEditForm') }))
vi.mock('@/components/system-admin/crm/PersonRelationEditor', () => ({ PersonRelationEditor: stub('PersonRelationEditor') }))
vi.mock('@/components/system-admin/crm/ChannelEditor', () => ({ ChannelEditor: stub('ChannelEditor') }))
vi.mock('@/components/system-admin/crm/PersonForm', () => ({ PersonForm: stub('PersonForm') }))
vi.mock('@/components/system-admin/crm/SafetyPanel', () => ({ SafetyPanel: stub('SafetyPanel') }))

import * as api from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'

const en = tSysAdmin('en')
const el = tSysAdmin('el')
const A = '@/app/(system-admin)/admin/(portal)/crm'
const props = (name: string) => JSON.parse(screen.getByTestId(name).getAttribute('data-props')!)
const me = (over: Record<string, unknown> = {}) => ({ id: 1, email: 'a@b.c', role: 'editor', permissions: null, ...over }) as never
type Page = (p: never) => Promise<React.ReactElement>
const show = async (Page: unknown, p: unknown = {}) => render(await (Page as Page)(p as never))

beforeEach(() => {
  vi.mocked(getLangServer).mockResolvedValue('en')
  vi.mocked(api.getAdminMe).mockResolvedValue(me())
  vi.mocked(api.getCrmOrg).mockReset()
})

describe('crm/persons/[id]', () => {
  const load = async (lang: 'en' | 'el' = 'en') => {
    vi.mocked(getLangServer).mockResolvedValue(lang)
    const person = rec.personDetail()
    const org = rec.orgDetail()
    vi.mocked(api.getCrmPerson).mockResolvedValue(person)
    vi.mocked(api.getCrmOrg).mockResolvedValue(org)
    const { default: Page } = await import(`${A}/persons/[id]/page`)
    await show(Page, { params: Promise.resolve({ id: String(person.id) }) })
    return { person, org }
  }

  it('h1 is the name; salutation and birthday (29 Feb, year unknown) without the year 2000 and without an age', async () => {
    const { person } = await load()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([person.display_name])
    expect(screen.getByTestId('person-birthday').textContent).toBe('29 February')
    expect(document.body.textContent).not.toContain('2000')
    expect(screen.getByText('Ms')).toBeTruthy()
  })

  it('Greek: "29 Φεβρουαρίου" and the Greek salutation', async () => {
    await load('el')
    expect(screen.getByTestId('person-birthday').textContent).toBe('29 Φεβρουαρίου')
    expect(screen.getByText('Κα')).toBeTruthy()
    expect(screen.getByText(el.crm_person_channels_title)).toBeTruthy()
  })

  it('personal channels section with hint; ChannelEditor gets the person as owner and the active relations as move targets', async () => {
    const { person } = await load()
    expect(screen.getByText(en.crm_person_channels_title)).toBeTruthy()
    expect(screen.getByText(en.crm_person_channels_hint)).toBeTruthy()
    const active = person.relations.filter((relation) => relation.active)
    expect(props('ChannelEditor')).toMatchObject({
      owner: { type: 'person', id: person.id }, personId: person.id, canWrite: true, canSetTier: true,
      channels: person.channels,
      moveTargets: active.map((relation) => ({ owner: { type: 'relation', id: relation.id }, label: `${relation.org.name} (Relation)` })),
    })
  })

  it('organisation channels are loaded only for active relations and handed to the relation editor', async () => {
    const { person, org } = await load()
    const activeOrgIds = [...new Set(person.relations.filter((r) => r.active).map((r) => r.org.id))]
    expect(vi.mocked(api.getCrmOrg).mock.calls.map(([id]) => id)).toEqual(activeOrgIds)
    expect(props('PersonRelationEditor').orgChannels).toEqual({ [org.id]: org.channels })
    expect(props('PersonEditForm')).toMatchObject({ lang: 'en', person: { id: person.id } })
  })

  it('a failing organisation read only empties its choices; the page still renders', async () => {
    const person = rec.personDetail()
    vi.mocked(api.getCrmPerson).mockResolvedValue(person)
    vi.mocked(api.getCrmOrg).mockRejectedValue(new Error('API_ERROR:500'))
    const { default: Page } = await import(`${A}/persons/[id]/page`)
    await show(Page, { params: Promise.resolve({ id: String(person.id) }) })
    expect(Object.values(props('PersonRelationEditor').orgChannels)).toEqual([[]])
  })

  it('without crm:contacts:write: no edit form, read-only channels and relations', async () => {
    vi.mocked(api.getAdminMe).mockResolvedValue(me({ permissions: ['crm:contacts:read'] }))
    await load()
    expect(screen.queryByTestId('PersonEditForm')).toBeNull()
    expect(props('ChannelEditor')).toMatchObject({ canWrite: false, canSetTier: false })
    expect(props('PersonRelationEditor')).toMatchObject({ canWrite: false })
  })

  it('unknown person -> notFound()', async () => {
    vi.mocked(api.getCrmPerson).mockRejectedValue(new Error('API_ERROR:404'))
    const { default: Page } = await import(`${A}/persons/[id]/page`)
    await expect((Page as Page)({ params: Promise.resolve({ id: '999999' }) } as never)).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('a free name without birthday and salutation shows dashes, never "null"', async () => {
    vi.mocked(api.getCrmPerson).mockResolvedValue(rec.personFree())
    const { default: Page } = await import(`${A}/persons/[id]/page`)
    await show(Page, { params: Promise.resolve({ id: '1' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Γεωργίου Ελένη')
    expect(screen.getByTestId('person-birthday').textContent).toBe('—')
    expect(document.body.textContent).not.toContain('null')
    expect(api.getCrmOrg).not.toHaveBeenCalled()
  })
})

describe('crm/persons (list)', () => {
  it('name links and the number of active relations; the search stays a name search with at least 3 characters', async () => {
    const list = rec.personList()
    vi.mocked(api.getCrmPersons).mockResolvedValue(list)
    const { default: Page } = await import(`${A}/persons/page`)
    await show(Page, { searchParams: Promise.resolve({ q: 'Maria Georgiou' }) })
    expect(api.getCrmPersons).toHaveBeenLastCalledWith({ q: 'Maria Georgiou' })
    expect(screen.getByRole('columnheader', { name: en.crm_person_col_relations })).toBeTruthy()
    const first = list.items[0]
    const row = screen.getAllByRole('link', { name: first.display_name! })[0].closest('tr')!
    expect(row.querySelectorAll('td')[2].textContent).toBe(String(first.relations.filter((r) => r.active).length))
  })

  it('a query under 3 characters is not sent; no hit shows "No results"', async () => {
    vi.mocked(api.getCrmPersons).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 })
    const { default: Page } = await import(`${A}/persons/page`)
    await show(Page, { searchParams: Promise.resolve({ q: 'ma' }) })
    expect(api.getCrmPersons).toHaveBeenLastCalledWith({ q: undefined })
    expect(screen.getByText(en.no_results)).toBeTruthy()
  })
})

describe('crm/persons/new and crm/settings', () => {
  it('new person page passes the language for the birthday field', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    const { default: Page } = await import(`${A}/persons/new/page`)
    await show(Page)
    expect(props('PersonForm')).toEqual({ lang: 'el' })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(el.crm_person_new)
  })

  it('settings page hands the recorded config to the SafetyPanel and links back to the organisations', async () => {
    const config = rec.config()
    vi.mocked(api.getCrmConfig).mockResolvedValue(config)
    const { default: Page } = await import(`${A}/settings/page`)
    await show(Page)
    expect(props('SafetyPanel')).toEqual({ config, canWrite: true })
    expect(screen.getByRole('link').getAttribute('href')).toBe('/admin/crm/orgs')
  })

  it('settings without crm:config:write -> read-only panel', async () => {
    vi.mocked(api.getCrmConfig).mockResolvedValue(rec.config())
    vi.mocked(api.getAdminMe).mockResolvedValue(me({ permissions: ['crm:contacts:read'] }))
    const { default: Page } = await import(`${A}/settings/page`)
    await show(Page)
    expect(props('SafetyPanel').canWrite).toBe(false)
  })
})
