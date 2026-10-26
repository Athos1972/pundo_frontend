// F7600 CRM-Backbone, follow-up "Widerspruch einer Person im Admin erfassen" (record objection): button and dialog
// (PersonObjectionAction), the person page (banner, section "Privacy", rights) and the org timeline label.
// Backend answers are the recorded files of the slot backend (e2e/fixtures/contracts/crm-persons: candidate, 200, 409,
// 422, organisation after the owner objection; R1). Assertions check the effect: request body and count, rendered text,
// toast or alert, refresh, and that Cancel sends nothing.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonObjectionAction } from '@/components/system-admin/crm/PersonObjectionAction'
import { objectionChannelCount, objectionOrgsOf, type ObjectionOrg } from '@/components/system-admin/crm/crmObjection'
import { InteractionTimeline } from '@/components/system-admin/crm/InteractionTimeline'
import { CRM_ERROR_KEYS } from '@/components/system-admin/crm/crmFetch'
import { objectionSourceLabel } from '@/components/system-admin/crm/crmLabels'
import { showToast } from '@/components/system-admin/Toast'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { rec, recorded, type Recorded } from './helpers/crm-person-recorded'
import type { CrmPerson } from '@/types/system-admin'
import * as api from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'

const refresh = vi.fn()
class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  notFound: () => { throw new NotFoundError() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement('a', { href }, children),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-api')
// the person page renders these client components too; here only the objection part counts
vi.mock('@/components/system-admin/crm/PersonEditForm', () => ({ PersonEditForm: () => null }))
vi.mock('@/components/system-admin/crm/PersonRelationEditor', () => ({ PersonRelationEditor: () => null }))
vi.mock('@/components/system-admin/crm/ChannelEditor', () => ({ ChannelEditor: () => null }))

const en = tSysAdmin('en')
const el = tSysAdmin('el')

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); vi.mocked(showToast).mockReset() })

// ─── fetch helpers ────────────────────────────────────────────────────────────────────────────────────────────────
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
function stubFetch(answer: () => Response) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => answer())
  vi.stubGlobal('fetch', mock)
  return mock
}
const fromFile = (file: Recorded<unknown>) => () => json(file.body, file.status)

// ─── dialog data from the recorded candidate ──────────────────────────────────────────────────────────────────────
const candidate = () => rec.objectionCandidate()
const orgsOf = (person: CrmPerson, leadStates: Record<number, NonNullable<ObjectionOrg['leadState']>> = {}) =>
  objectionOrgsOf(person, leadStates)
const ownerOrg = (person: CrmPerson) => person.relations.find((r) => r.roles.includes('owner'))!.org
const otherOrg = (person: CrmPerson) => person.relations.find((r) => !r.roles.includes('owner'))!.org

function openDialog(props: Partial<React.ComponentProps<typeof PersonObjectionAction>> = {}, lang: 'en' | 'el' = 'en') {
  const person = candidate()
  render(
    <PersonObjectionAction
      personId={person.id}
      channelCount={objectionChannelCount(person)}
      orgs={orgsOf(person)}
      ownerRule={rec.config().owner_optout_rule}
      tr={lang === 'el' ? el : en}
      {...props}
    />,
  )
  fireEvent.click(screen.getByTestId('person-objection-button'))
  return { person, dialog: screen.getByRole('dialog') }
}
const confirmButton = () => screen.getByTestId('person-objection-confirm') as HTMLButtonElement
const fill = (source: string, reason: string) => {
  fireEvent.change(screen.getByLabelText(en.crm_person_objection_source_label), { target: { value: source } })
  fireEvent.change(screen.getByLabelText(en.crm_outreach_approve_reason), { target: { value: reason } })
}
const REASON = 'Called on 25 Oct, wants no further contact'

describe('recorded answers of POST /persons/{id}/opt-out', () => {
  it('200 is PersonOut with the objection (source, reason, admin) and every own channel blocked', () => {
    const body = recorded<CrmPerson>('person-optout-ok')
    expect(body.status).toBe(200)
    expect(body.body).toMatchObject({ optout: true, optout_source: 'phone', optout_reason: REASON })
    expect(body.body.optout_at).toBeTruthy()
    expect(body.body.optout_by).toBeTruthy()
    const states = [...body.body.channels, ...body.body.relations.flatMap((r) => r.channels)].map((c) => c.consent_state)
    expect(states).toHaveLength(5)
    expect(new Set(states)).toEqual(new Set(['optout']))
  })

  it.each([
    ['person-optout-409', 409, 'person_already_opted_out', en.crm_err_person_already_opted_out, el.crm_err_person_already_opted_out],
    ['person-optout-422', 422, 'person_optout_reason_invalid', en.crm_err_person_optout_reason_invalid, el.crm_err_person_optout_reason_invalid],
  ])('%s: %i %s has a text in EN and EL', (name, status, code, enText, elText) => {
    const file = recorded<{ detail: string }>(name)
    expect([file.status, file.body.detail]).toEqual([status, code])
    expect(CRM_ERROR_KEYS).toHaveProperty(code)
    expect(enText).toBeTruthy()
    expect(elText).toBeTruthy()
    expect(elText).not.toBe(enText)
  })
})

describe('PersonObjectionAction: dialog content', () => {
  it('counts personal plus relation channels (2 + 2 + 1 = 5) and names every active organisation', () => {
    const person = candidate()
    expect(objectionChannelCount(person)).toBe(5)
    const { dialog } = openDialog()
    // owner rule on and the person owns C: the effect names the blocked owner organisation, then the others
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe([
      en.crm_person_objection_effect.replace('{n}', '5'), en.crm_person_objection_owner_orgs_blocked,
      en.crm_person_objection_other_orgs_stay,
    ].join(' '))
    expect(within(dialog).getByTestId('person-objection-effect').textContent).not.toContain(en.crm_person_objection_orgs_stay)
    const items = within(dialog).getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual([
      en.crm_person_objection_owner_on.replace('{org}', ownerOrg(person).name),
      en.crm_person_objection_org_stays.replace('{org}', otherOrg(person).name),
    ])
    expect(within(dialog).getByText(en.crm_person_objection_irreversible)).toBeTruthy()
    expect(within(dialog).getByText(en.crm_person_objection_reason_help)).toBeTruthy()
  })

  it('owner rule off: the owner organisation stays contactable', () => {
    const person = candidate()
    const { dialog } = openDialog({ ownerRule: false })
    expect(within(dialog).getByText(en.crm_person_objection_owner_off.replace('{org}', ownerOrg(person).name))).toBeTruthy()
    expect(within(dialog).queryByText(en.crm_person_objection_owner_on.replace('{org}', ownerOrg(person).name))).toBeNull()
    // rule off: no organisation is blocked, the effect says all organisations stay contactable
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe(
      `${en.crm_person_objection_effect.replace('{n}', '5')} ${en.crm_person_objection_orgs_stay}`)
  })

  it('no owner relation: the effect says the organisations stay contactable', () => {
    const person = candidate()
    const { dialog } = openDialog({ orgs: orgsOf(person).filter((o) => !o.isOwner) })
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe(
      `${en.crm_person_objection_effect.replace('{n}', '5')} ${en.crm_person_objection_orgs_stay}`)
  })

  it('only owner organisations: the effect names the blocking and no "other organisations"', () => {
    const person = candidate()
    const { dialog } = openDialog({ orgs: orgsOf(person).filter((o) => o.isOwner) })
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe(
      `${en.crm_person_objection_effect.replace('{n}', '5')} ${en.crm_person_objection_owner_orgs_blocked}`)
  })

  it.each([['en', en], ['el', el]] as const)('exactly one channel: singular wording (%s)', (lang, tr) => {
    const person = candidate()
    const { dialog } = openDialog({ channelCount: 1, orgs: orgsOf(person).filter((o) => !o.isOwner) }, lang)
    const text = within(dialog).getByTestId('person-objection-effect').textContent
    expect(text).toBe(`${tr.crm_person_objection_effect_one} ${tr.crm_person_objection_orgs_stay}`)
    expect(text).not.toMatch(/\b1\b/)
  })

  it('no channels but an owner relation: the owner blocking is still named', () => {
    const { dialog } = openDialog({ channelCount: 0 })
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe([
      en.crm_person_objection_no_channels, en.crm_person_objection_owner_orgs_blocked, en.crm_person_objection_other_orgs_stay,
    ].join(' '))
  })

  it('owner rule unreadable (null): the stricter note as if on (A4)', () => {
    const person = candidate()
    const { dialog } = openDialog({ ownerRule: null })
    expect(within(dialog).getByText(en.crm_person_objection_owner_on.replace('{org}', ownerOrg(person).name))).toBeTruthy()
  })

  it('registered owner organisation: stays registered, channels blocked', () => {
    const person = candidate()
    const { dialog } = openDialog({ orgs: orgsOf(person, { [ownerOrg(person).id]: 'REGISTERED' }) })
    expect(within(dialog).getByText(en.crm_person_objection_owner_on_registered.replace('{org}', ownerOrg(person).name))).toBeTruthy()
  })

  it('empty case: no channels and no relation → "No channels yet", no organisation list', () => {
    const free = rec.personFree()
    expect(objectionChannelCount(free)).toBe(0)
    const { dialog } = openDialog({ personId: free.id, channelCount: 0, orgs: orgsOf(free) })
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe(en.crm_person_objection_no_channels)
    expect(within(dialog).queryByTestId('person-objection-orgs')).toBeNull()
  })

  it('Greek: title, effect, sources and the owner note in EL', () => {
    const person = candidate()
    const { dialog } = openDialog({}, 'el')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe(el.crm_person_objection_button)
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toBe([
      el.crm_person_objection_effect.replace('{n}', '5'), el.crm_person_objection_owner_orgs_blocked,
      el.crm_person_objection_other_orgs_stay,
    ].join(' '))
    expect(within(dialog).getByText(el.crm_person_objection_owner_on.replace('{org}', ownerOrg(person).name))).toBeTruthy()
    const options = within(dialog).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual([el.select_placeholder, el.crm_objection_source_phone, el.crm_objection_source_email,
      el.crm_objection_source_in_person, el.crm_objection_source_letter, el.crm_objection_source_other])
  })
})

describe('PersonObjectionAction: required fields and sending', () => {
  it.each([
    ['', REASON, true],
    ['phone', '', true],
    ['phone', '123456789', true],
    ['phone', '   123456789   ', true],
    ['phone', '1234567890', false],
    ['letter', 'x'.repeat(500), false],
  ])('source "%s", reason of %j → confirm disabled: %s', (source, reason, disabled) => {
    openDialog()
    fill(source, reason)
    expect(confirmButton().disabled).toBe(disabled)
  })

  it('the reason field takes at most 500 characters and counts the trimmed length', () => {
    openDialog()
    const area = screen.getByLabelText(en.crm_outreach_approve_reason) as HTMLTextAreaElement
    expect(area.maxLength).toBe(500)
    fill('phone', '  abc  ')
    expect(screen.getByTestId('person-objection-count').textContent).toBe(en.crm_person_objection_reason_count.replace('{n}', '3'))
  })

  it('Cancel sends no request and closes the dialog', () => {
    const fetchMock = stubFetch(fromFile(recorded('person-optout-ok')))
    openDialog()
    fill('phone', REASON)
    fireEvent.click(screen.getByRole('button', { name: en.cancel }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('confirm sends exactly one POST with source and the trimmed reason, then closes and refreshes (recorded 200)', async () => {
    const fetchMock = stubFetch(fromFile(recorded('person-optout-ok')))
    const { person } = openDialog()
    fill('phone', `  ${REASON}  `)
    await act(async () => { fireEvent.click(confirmButton()) })
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect([url, init.method]).toEqual([`/api/admin/crm/persons/${person.id}/opt-out`, 'POST'])
    expect(JSON.parse(String(init.body))).toEqual({ source: 'phone', reason: REASON })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(showToast).not.toHaveBeenCalled()
  })

  it('recorded 409 person_already_opted_out: text in the dialog, no toast, refresh, confirm stays off', async () => {
    stubFetch(fromFile(recorded('person-optout-409')))
    openDialog()
    fill('email', REASON)
    await act(async () => { fireEvent.click(confirmButton()) })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.crm_err_person_already_opted_out))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(showToast).not.toHaveBeenCalled()
    expect(confirmButton().disabled).toBe(true)
  })

  it('recorded 422 person_optout_reason_invalid: toast with its text, dialog stays open, no refresh', async () => {
    stubFetch(fromFile(recorded('person-optout-422')))
    openDialog()
    fill('phone', REASON)
    await act(async () => { fireEvent.click(confirmButton()) })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(en.crm_err_person_optout_reason_invalid, 'error'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('500 person_optout_no_effect (rolled back): generic toast, dialog stays open, no refresh', async () => {
    stubFetch(() => json({ detail: 'person_optout_no_effect' }, 500))
    openDialog()
    fill('other', REASON)
    await act(async () => { fireEvent.click(confirmButton()) })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(en.crm_err_generic, 'error'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('version_conflict of the owner rule (409): the conflict text as toast, dialog stays open', async () => {
    stubFetch(() => json({ detail: { detail: 'version_conflict', current_version: 4 } }, 409))
    openDialog()
    fill('phone', REASON)
    await act(async () => { fireEvent.click(confirmButton()) })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(en.crm_err_conflict, 'error'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('InteractionTimeline: person_optout', () => {
  it('the recorded interaction of the owner objection reads "Person objected" instead of the raw code', () => {
    const org = rec.orgAfterOwnerObjection()
    const objections = org.interactions.filter((i) => i.outcome === 'person_optout')
    expect(objections).toHaveLength(1)
    expect(objections[0].payload).toMatchObject({ owner_rule_applied: true, source: 'phone' })
    render(<InteractionTimeline interactions={objections} messages={[]} relations={org.relations} tr={en} />)
    expect(screen.getByText(en.crm_timeline_person_objected)).toBeTruthy()
    expect(screen.queryByText('person_optout')).toBeNull()
  })

  it('an unknown outcome stays raw', () => {
    const org = rec.orgAfterOwnerObjection()
    const other = { ...org.interactions[0], outcome: 'brand_new_outcome' }
    render(<InteractionTimeline interactions={[other]} messages={[]} tr={en} />)
    expect(screen.getByText('brand_new_outcome')).toBeTruthy()
  })
})

describe('objectionOrgsOf', () => {
  it('lists only active relations, one entry per organisation, owner when any active relation has the role', () => {
    const person = candidate()
    const [owner, other] = [ownerOrg(person), otherOrg(person)]
    const ended = { ...person.relations[0], id: 999, active: false, org: { id: 4242, name: 'Ended Org', city: null } }
    const second = { ...person.relations.find((r) => r.org.id === other.id)!, id: 998, roles: ['owner'] }
    const orgs = objectionOrgsOf({ relations: [...person.relations, ended, second] }, { [owner.id]: 'QUEUED' })
    expect(orgs.map((o) => [o.id, o.isOwner, o.leadState])).toEqual([[owner.id, true, 'QUEUED'], [other.id, true, undefined]])
  })
})

describe('objectionSourceLabel', () => {
  it('labels every stored source incl. the unsubscribe link; unknown values stay raw', () => {
    expect(objectionSourceLabel(en, 'phone')).toBe(en.crm_objection_source_phone)
    expect(objectionSourceLabel(el, 'optout_link')).toBe(el.crm_objection_source_optout_link)
    expect(objectionSourceLabel(en, 'carrier_pigeon')).toBe('carrier_pigeon')
  })
})

// ─── person page (Server Component, called directly; page.route cannot see server fetches) ────────────────────────
describe('crm/persons/[id]: banner and section "Privacy"', () => {
  const me = (over: Record<string, unknown> = {}) => ({ id: 1, email: 'a@b.c', role: 'editor', permissions: null, ...over }) as never
  beforeEach(() => {
    vi.mocked(getLangServer).mockResolvedValue('en')
    vi.mocked(api.getAdminMe).mockResolvedValue(me())
    vi.mocked(api.getCrmConfig).mockResolvedValue(rec.config())
    vi.mocked(api.getCrmOrg).mockImplementation(async (id: number) => {
      const org = rec.orgDetail()
      return { ...org, id, lead: { ...org.lead, state: id === ownerOrg(candidate()).id ? 'REGISTERED' : 'QUEUED' } }
    })
  })

  async function showPage(person: CrmPerson, lang: 'en' | 'el' = 'en') {
    vi.mocked(getLangServer).mockResolvedValue(lang)
    vi.mocked(api.getCrmPerson).mockResolvedValue(person)
    const { default: Page } = await import('@/app/(system-admin)/admin/(portal)/crm/persons/[id]/page')
    render(await Page({ params: Promise.resolve({ id: String(person.id) }) }))
  }

  it('with crm:suppress_override and without objection: section "Privacy" with the button; dialog shows 5 channels and the REGISTERED owner note', async () => {
    const person = candidate()
    await showPage(person)
    const section = screen.getByTestId('person-privacy-section')
    expect(within(section).getByRole('heading', { level: 2 }).textContent).toBe(en.crm_person_privacy_title)
    expect(screen.queryByTestId('person-objection-banner')).toBeNull()
    fireEvent.click(within(section).getByTestId('person-objection-button'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByTestId('person-objection-effect').textContent).toContain('5')
    expect(within(dialog).getByText(en.crm_person_objection_owner_on_registered.replace('{org}', ownerOrg(person).name))).toBeTruthy()
    expect(within(dialog).getByText(en.crm_person_objection_org_stays.replace('{org}', otherOrg(person).name))).toBeTruthy()
  })

  it('only crm:contacts:write: no section, no button (AC 1)', async () => {
    vi.mocked(api.getAdminMe).mockResolvedValue(me({ permissions: ['crm:contacts:read', 'crm:contacts:write'] }))
    await showPage(candidate())
    expect(screen.queryByTestId('person-privacy-section')).toBeNull()
    expect(screen.queryByTestId('person-objection-button')).toBeNull()
  })

  it('config unreadable: the dialog warns as if the owner rule were on (A4)', async () => {
    vi.mocked(api.getCrmConfig).mockRejectedValue(new Error('403'))
    vi.mocked(api.getCrmOrg).mockRejectedValue(new Error('down'))
    const person = candidate()
    await showPage(person)
    fireEvent.click(screen.getByTestId('person-objection-button'))
    expect(screen.getByText(en.crm_person_objection_owner_on.replace('{org}', ownerOrg(person).name))).toBeTruthy()
  })

  it('after the objection (recorded 200): banner with date, source and reason; no button (AC 5, 14)', async () => {
    // the recorded admin id is a short number; a unique stand-in proves it is never rendered (A3)
    const person = { ...rec.optoutOk(), optout_by: 'ADMIN-ID-NOT-SHOWN' }
    await showPage(person)
    const banner = screen.getByTestId('person-objection-banner')
    expect(within(banner).getByText(en.crm_person_optout_hint)).toBeTruthy()
    const date = new Date(person.optout_at!).toLocaleDateString('en')
    expect(within(banner).getByTestId('person-objection-recorded').textContent).toBe(
      en.crm_person_objection_recorded.replace('{date}', date).replace('{source}', en.crm_objection_source_phone))
    expect(within(banner).getByTestId('person-objection-reason').textContent).toBe(REASON)
    expect(screen.queryByTestId('person-privacy-section')).toBeNull()
    expect(screen.queryByTestId('person-objection-button')).toBeNull()
    expect(document.body.textContent).not.toContain('ADMIN-ID-NOT-SHOWN')
    expect(api.getCrmConfig).not.toHaveBeenCalled()
  })

  it('Greek banner; an objection without stored source (before the migration) shows only the date', async () => {
    const legacy = { ...rec.optoutOk(), optout_source: null, optout_reason: null }
    await showPage(legacy, 'el')
    const banner = screen.getByTestId('person-objection-banner')
    const date = new Date(legacy.optout_at!).toLocaleDateString('el')
    expect(within(banner).getByTestId('person-objection-recorded').textContent).toBe(
      el.crm_person_objection_recorded_date.replace('{date}', date))
    expect(within(banner).queryByTestId('person-objection-reason')).toBeNull()
  })

  it('objection by the unsubscribe link: source label "Unsubscribe link in a mail"', async () => {
    await showPage({ ...rec.optoutOk(), optout_source: 'optout_link', optout_reason: null })
    expect(screen.getByTestId('person-objection-recorded').textContent).toContain(en.crm_objection_source_optout_link)
  })
})
