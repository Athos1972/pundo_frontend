import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { CrmContactDetail, CrmChannelOut, SysAdminUser, CrmContactListItem } from '@/types/system-admin'

const push = vi.fn()
const back = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, refresh, replace: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import { showToast } from '@/components/system-admin/Toast'
import { crmRequest, crmPost, crmPatch, crmDelete } from '@/components/system-admin/crm/crmFetch'
import { ContactForm } from '@/components/system-admin/crm/ContactForm'
import { ContactEditForm } from '@/components/system-admin/crm/ContactEditForm'
import { ChannelEditor } from '@/components/system-admin/crm/ChannelEditor'
import { ChannelList } from '@/components/system-admin/crm/ChannelList'
import { ContactList } from '@/components/system-admin/crm/ContactList'
import { InteractionTimeline } from '@/components/system-admin/crm/InteractionTimeline'
import { LifecycleBadge } from '@/components/system-admin/crm/LifecycleBadge'
import { CardImageViewer } from '@/components/system-admin/crm/CardImageViewer'
import { ContactDetailActions } from '@/components/system-admin/crm/ContactDetailActions'
import { OutreachComposer } from '@/components/system-admin/crm/OutreachComposer'

const mockFetch = vi.fn()
const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')

const res = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => { if (body === undefined) throw new Error('no body'); return body },
})

beforeEach(() => {
  push.mockReset(); back.mockReset(); refresh.mockReset(); mockFetch.mockReset()
  vi.mocked(showToast).mockClear()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

const channel = (id: number, over: Partial<CrmChannelOut> = {}): CrmChannelOut => ({
  id, kind: 'email', value_normalized: `c${id}@x.io`, reachable: 'yes', consent_state: 'opted_in',
  is_preferred: id === 1, created_at: '', ...over,
})

function contact(over: Partial<CrmContactDetail> = {}): CrmContactDetail {
  return {
    id: 5, org: { id: 1, name: 'Acme', city: 'Larnaca', category: 'cafe', business_status: 'unconfirmed', shop_id: null },
    display_name: 'Mia', role_title: 'Owner', lifecycle_state: 'SOURCED', effective_legal_tier: 'B', effective_legal_basis: 'li',
    owner_id: null, shop_id: null, needs_human: false, agent_paused: false, version: 3,
    card_image_front_url: null, card_image_back_url: null,
    channels: [channel(1)], sources: [], interactions: [], messages: [], created_at: '', updated_at: '',
    ...over,
  }
}
const superadmin: SysAdminUser = { id: 1, email: 'a@b.io', role: 'superadmin', permissions: null }
const editor = (permissions: string[] | null): SysAdminUser => ({ id: 2, email: 'e@b.io', role: 'editor', permissions })

// ─── crmFetch ───────────────────────────────────────────────────────────────────

describe('crmRequest', () => {
  it('returns parsed JSON on success and sends a JSON body', async () => {
    mockFetch.mockResolvedValue(res(201, { id: 9 }))
    const r = await crmPost<{ id: number }>('crm/contacts', { a: 1 }, tr)
    expect(r).toEqual({ ok: true, data: { id: 9 }, status: 201 })
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/crm/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}',
    })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('DELETE sends no body and tolerates an empty 204 response', async () => {
    mockFetch.mockResolvedValue(res(204))
    const r = await crmDelete('crm/contacts/1/channels/2', tr)
    expect(r).toEqual({ ok: true, data: undefined, status: 204 })
    expect(mockFetch.mock.calls[0][1].body).toBeUndefined()
  })

  it('PATCH works like POST', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    await crmPatch('crm/contacts/1', { x: 1 }, tr)
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })

  it.each([
    [403, 'crm_err_forbidden'],
    [404, 'crm_err_not_found'],
    [409, 'crm_err_conflict'],
    [502, 'crm_err_send_failed'],
    [500, 'crm_err_generic'],
  ] as const)('status %i maps to its own toast', async (status, key) => {
    mockFetch.mockResolvedValue(res(status, {}))
    const r = await crmRequest('POST', 'x', {}, tr)
    expect(r).toEqual({ ok: false, status })
    expect(showToast).toHaveBeenCalledWith(tr[key], 'error')
  })

  it.each([
    ['suppressed', 'crm_err_suppressed'],
    ['illegal_transition', 'crm_err_illegal_transition'],
    ['shop_id_required', 'crm_err_shop_id_required'],
    ['no_email_channel', 'crm_err_no_email'],
    ['last_channel', 'crm_err_last_channel'],
    ['duplicate_channel', 'crm_err_duplicate_channel'],
    ['something_new', 'crm_err_generic'],
  ] as const)('422 string detail %s -> %s', async (detail, key) => {
    mockFetch.mockResolvedValue(res(422, { detail }))
    await crmRequest('POST', 'x', {}, tr)
    expect(showToast).toHaveBeenCalledWith(tr[key], 'error')
  })

  it('422 object detail is understood as well, unknown object detail is generic', async () => {
    mockFetch.mockResolvedValueOnce(res(422, { detail: { detail: 'suppressed', channel_kind: 'email' } }))
    await crmRequest('POST', 'x', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith(tr.crm_err_suppressed, 'error')
    mockFetch.mockResolvedValueOnce(res(422, { detail: { detail: 'weird' } }))
    await crmRequest('POST', 'x', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith(tr.crm_err_generic, 'error')
    mockFetch.mockResolvedValueOnce(res(422, { detail: { detail: 'illegal_transition' } }))
    await crmRequest('POST', 'x', {}, tr)
    expect(showToast).toHaveBeenLastCalledWith(tr.crm_err_illegal_transition, 'error')
  })

  it('422 without a parseable body falls back to the generic toast', async () => {
    mockFetch.mockResolvedValue(res(422))
    const r = await crmRequest('POST', 'x', {}, tr)
    expect(r.status).toBe(422)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
  })

  it('network errors toast and report failure without a status', async () => {
    mockFetch.mockRejectedValue(new Error('down'))
    expect(await crmRequest('POST', 'x', {}, tr)).toEqual({ ok: false })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
  })

  it('401 sends the user to the login page without a toast', async () => {
    const original = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '/admin/crm' } })
    try {
      mockFetch.mockResolvedValue(res(401, {}))
      const r = await crmRequest('POST', 'x', {}, tr)
      expect(r).toEqual({ ok: false, status: 401 })
      expect(window.location.href).toBe('/admin/login')
      expect(showToast).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })
})

// ─── Display components ─────────────────────────────────────────────────────────

describe('LifecycleBadge', () => {
  it('shows the label for known and unknown states', () => {
    const { rerender } = render(<LifecycleBadge state="DEAD" stateLabel="Dead" />)
    expect(screen.getByText('Dead')).toBeTruthy()
    rerender(<LifecycleBadge state="FUTURE_STATE" stateLabel="Future" />)
    expect(screen.getByText('Future')).toBeTruthy()
  })
})

describe('ChannelList', () => {
  it('shows the empty state', () => {
    render(<ChannelList channels={[]} tr={tr} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('lists channels and marks the preferred one', () => {
    render(<ChannelList tr={tr} channels={[
      channel(1),
      channel(2, { kind: 'sms', consent_state: 'hard_optout', reachable: 'no', value_normalized: '+35799' }),
      channel(3, { consent_state: 'unknown', reachable: 'maybe' }),
    ]} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('★')).toBeTruthy()
    expect(within(rows[1]).queryByText('★')).toBeNull()
    expect(within(rows[1]).getByText('+35799')).toBeTruthy()
    expect(within(rows[1]).getByText('hard_optout')).toBeTruthy()
  })
})

describe('InteractionTimeline', () => {
  it('shows the empty state', () => {
    render(<InteractionTimeline interactions={[]} messages={[]} tr={tr} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('renders state changes, field edits, channel changes and messages', () => {
    render(<InteractionTimeline tr={tr} interactions={[
      { id: 1, actor_type: 'admin', actor_id: '7', kind: 'state_change', channel: 'system', direction: 'internal', state_from: 'SOURCED', state_to: 'QUEUED', outcome: 'ok-outcome', created_at: '2026-01-01T10:00:00Z' },
      { id: 2, actor_type: 'admin', kind: 'contact_updated', channel: 'system', direction: 'internal', payload: { fields: ['city', 'name'] }, created_at: '2026-01-02T10:00:00Z' },
      { id: 3, actor_type: 'admin', kind: 'channel_added', channel: 'system', direction: 'internal', payload: { channel_kind: 'email' }, created_at: '2026-01-03T10:00:00Z' },
      { id: 4, actor_type: 'admin', kind: 'channel_removed', channel: 'system', direction: 'internal', payload: { channel_kind: 'sms' }, created_at: '2026-01-04T10:00:00Z' },
    ]} messages={[
      { id: 11, channel: 'email', direction: 'outbound', delivery_status: 'failed', error_code: 'SMTP_550', retry_count: 2, language: 'el', subject_rendered: 'Hello shop', created_at: '2026-01-05T10:00:00Z', updated_at: '' },
      { id: 12, channel: 'email', direction: 'outbound', delivery_status: 'sent', retry_count: 0, created_at: '2026-01-06T10:00:00Z', updated_at: '' },
    ]} />)
    expect(screen.getByText('SOURCED → QUEUED')).toBeTruthy()
    expect(screen.getByText('ok-outcome')).toBeTruthy()
    expect(screen.getByText(/admin #7/)).toBeTruthy()
    expect(screen.getByText(`${tr.crm_timeline_changed} city, name`)).toBeTruthy()
    expect(screen.getByText('+ email')).toBeTruthy()
    expect(screen.getByText('− sms')).toBeTruthy()
    expect(screen.getByText('Hello shop')).toBeTruthy()
    expect(screen.getByText(`${tr.crm_timeline_error} SMTP_550`)).toBeTruthy()
    expect(screen.getByText(/retries: 2/)).toBeTruthy()
    expect(screen.getAllByText(/retries/)).toHaveLength(1)
  })
})

describe('ContactList', () => {
  const contacts: CrmContactListItem[] = [
    { id: 1, display_name: 'Mia', org_name: 'Acme', primary_email: 'm@a.io', lifecycle_state: 'QUEUED', version: 1, updated_at: '2026-01-01T00:00:00Z' },
    { id: 2, display_name: null, org_name: 'Beta', primary_email: null, lifecycle_state: 'ZZ_UNKNOWN', version: 1, updated_at: '2026-01-02T00:00:00Z' },
  ]
  const base = { contacts, total: 2, page: 1, limit: 25, q: '', lifecycleState: '', tr }

  it('renders rows with placeholders for missing values and navigates on row click', async () => {
    const user = userEvent.setup()
    render(<ContactList {...base} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[1]).getAllByText('—')).toHaveLength(2)
    expect(within(rows[1]).getByText('ZZ_UNKNOWN')).toBeTruthy()  // unknown state falls back to the raw value
    expect(within(rows[0]).getByText(tr.crm_state_QUEUED)).toBeTruthy()
    await user.click(rows[0])
    expect(push).toHaveBeenCalledWith('/admin/crm/contacts/1')
  })

  it('shows the empty state and no pagination', () => {
    render(<ContactList {...base} contacts={[]} total={0} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
    expect(screen.queryByText(tr.next)).toBeNull()
  })

  it('filter chips keep the search term; "all" drops the state', () => {
    render(<ContactList {...base} q="cafe" lifecycleState="QUEUED" />)
    expect(screen.getByRole('link', { name: tr.crm_filter_all }).getAttribute('href')).toBe('/admin/crm/contacts?q=cafe')
    expect(screen.getByRole('link', { name: tr.crm_state_DEAD }).getAttribute('href')).toBe('/admin/crm/contacts?q=cafe&lifecycle_state=DEAD')
  })

  it('paginates: middle page links both ways and keeps the filters', () => {
    render(<ContactList {...base} total={80} page={2} limit={25} q="x" lifecycleState="QUEUED" />)
    expect(screen.getByText(tr.prev).getAttribute('href')).toBe('/admin/crm/contacts?q=x&lifecycle_state=QUEUED&page=1')
    expect(screen.getByText(tr.next).getAttribute('href')).toBe('/admin/crm/contacts?q=x&lifecycle_state=QUEUED&page=3')
    expect(screen.getByText(`${tr.showing} 26–50 ${tr.of} 80`)).toBeTruthy()
  })

  it('first and last page hide the unavailable direction; the last range is capped at total', () => {
    const { rerender } = render(<ContactList {...base} total={30} page={1} limit={25} />)
    expect(screen.queryByText(tr.prev)).toBeNull()
    expect(screen.getByText(tr.next)).toBeTruthy()
    rerender(<ContactList {...base} total={30} page={2} limit={25} />)
    expect(screen.queryByText(tr.next)).toBeNull()
    expect(screen.getByText(`${tr.showing} 26–30 ${tr.of} 30`)).toBeTruthy()
  })

  it('renders Greek labels', () => {
    render(<ContactList {...base} tr={trEl} />)
    expect(screen.getByRole('link', { name: trEl.crm_filter_all })).toBeTruthy()
  })
})

describe('CardImageViewer', () => {
  it('renders nothing without a front image', () => {
    const { container } = render(<CardImageViewer contactId={5} frontKey={null} backKey="b" tr={tr} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows only the front thumbnail when there is no back, with an auth-gated URL', () => {
    render(<CardImageViewer contactId={5} frontKey="f" backKey={null} tr={tr} />)
    expect(screen.getByAltText(tr.crm_card_front).getAttribute('src')).toBe('/api/v1/admin/crm/contacts/5/card-image/front')
    expect(screen.queryByAltText(tr.crm_card_back)).toBeNull()
  })

  it('opens a lightbox on thumbnail click and closes via X, backdrop; inner clicks keep it open', async () => {
    const user = userEvent.setup()
    render(<CardImageViewer contactId={5} frontKey="f" backKey="b" tr={tr} />)
    await user.click(screen.getByRole('button', { name: `Expand ${tr.crm_card_back}` }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_card_back })
    expect(within(dialog).getByAltText(tr.crm_card_back).getAttribute('src')).toBe('/api/v1/admin/crm/contacts/5/card-image/back')
    await user.click(within(dialog).getByAltText(tr.crm_card_back))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: tr.close }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: `Expand ${tr.crm_card_front}` }))
    await user.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// ─── ContactForm ────────────────────────────────────────────────────────────────

describe('ContactForm', () => {
  const orgField = () => screen.getByLabelText(new RegExp(`^${tr.crm_form_org_name}`))

  it('requires an email or phone (org name alone is rejected)', async () => {
    const user = userEvent.setup()
    render(<ContactForm tr={tr} />)
    await user.type(orgField(), 'Acme')
    await user.click(screen.getByRole('button', { name: tr.crm_form_submit }))
    expect(await screen.findByText(tr.crm_form_contact_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a blank org name', async () => {
    const user = userEvent.setup()
    render(<ContactForm tr={tr} />)
    await user.type(orgField(), '   ')
    await user.type(screen.getByLabelText(tr.crm_form_email), 'a@b.io')
    await user.click(screen.getByRole('button', { name: tr.crm_form_submit }))
    expect(await screen.findByText(tr.error_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('ingests the contact with both channels and opens the created contact', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(201, { id: 77 }))
    render(<ContactForm tr={tr} />)
    await user.type(orgField(), ' Acme ')
    await user.type(screen.getByLabelText(tr.crm_form_display_name), 'Mia')
    await user.type(screen.getByLabelText(tr.crm_form_email), 'mia@acme.io')
    await user.type(screen.getByLabelText(tr.crm_form_phone), '+35799')
    await user.type(screen.getByLabelText(tr.crm_form_city), 'Larnaca')
    await user.selectOptions(screen.getByLabelText(tr.crm_form_source), 'referral')
    await user.click(screen.getByRole('button', { name: tr.crm_form_submit }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/crm/contacts/77'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/ingest')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      org: { name: 'Acme', city: 'Larnaca', category: null },
      contact: { display_name: 'Mia', role_title: null },
      channels: [{ kind: 'email', value: 'mia@acme.io' }, { kind: 'phone', value: '+35799' }],
      source: { source: 'referral' },
    })
  })

  it('stays on the form when the backend rejects (toast shown by the fetch helper)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(409, {}))
    render(<ContactForm tr={tr} />)
    await user.type(orgField(), 'Acme')
    await user.type(screen.getByLabelText(tr.crm_form_phone), '+35799')
    await user.click(screen.getByRole('button', { name: tr.crm_form_submit }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error'))
    expect(push).not.toHaveBeenCalled()
  })

  it('cancel goes back', async () => {
    const user = userEvent.setup()
    render(<ContactForm tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(back).toHaveBeenCalled()
  })
})

// ─── ContactEditForm ────────────────────────────────────────────────────────────

describe('ContactEditForm', () => {
  it('is collapsed until the edit button is pressed and can be cancelled', async () => {
    const user = userEvent.setup()
    render(<ContactEditForm contact={contact()} tr={tr} />)
    expect(screen.queryByText(tr.crm_edit_title)).toBeNull()
    await user.click(screen.getByRole('button', { name: tr.edit }))
    expect(screen.getByText(tr.crm_edit_title)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(screen.getByRole('button', { name: tr.edit })).toBeTruthy()
  })

  it('prefills, PATCHes trimmed values (blank -> null), toasts, refreshes and collapses', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactEditForm contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    const city = screen.getByLabelText(tr.crm_form_city) as HTMLInputElement
    expect(city.value).toBe('Larnaca')
    await user.clear(city)
    const name = screen.getByLabelText(new RegExp(`^${tr.crm_form_org_name}`))
    await user.clear(name)
    await user.type(name, '  Acme Ltd ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/5')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      org: { name: 'Acme Ltd', city: null, category: 'cafe' }, display_name: 'Mia', role_title: 'Owner',
    })
    expect(showToast).toHaveBeenCalledWith(tr.crm_edit_saved, 'success')
    expect(screen.getByRole('button', { name: tr.edit })).toBeTruthy()
  })

  it('blank org name is rejected client-side', async () => {
    const user = userEvent.setup()
    render(<ContactEditForm contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    const name = screen.getByLabelText(new RegExp(`^${tr.crm_form_org_name}`))
    await user.clear(name)
    await user.type(name, '  ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText(tr.error_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('keeps the form open on a backend conflict', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(409, {}))
    render(<ContactEditForm contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error'))
    expect(screen.getByText(tr.crm_edit_title)).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })
})

// ─── ChannelEditor ──────────────────────────────────────────────────────────────

describe('ChannelEditor', () => {
  it('shows the empty state when there are no channels', () => {
    render(<ChannelEditor contact={contact({ channels: [] })} tr={tr} canWrite />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('read-only users see neither remove nor add controls', () => {
    render(<ChannelEditor contact={contact({ channels: [channel(1), channel(2)] })} tr={tr} canWrite={false} />)
    expect(screen.queryByText('×')).toBeNull()
    expect(screen.queryByText(new RegExp(tr.crm_channel_add))).toBeNull()
  })

  it('the last remaining channel cannot be removed', () => {
    render(<ChannelEditor contact={contact({ channels: [channel(1)] })} tr={tr} canWrite />)
    const btn = screen.getByText('×') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.title).toBe(tr.crm_err_last_channel)
  })

  it('removes a channel via DELETE and refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ChannelEditor contact={contact({ channels: [channel(1), channel(2)] })} tr={tr} canWrite />)
    await user.click(screen.getAllByText('×')[1])
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/5/channels/2')
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('does not refresh when removal is refused by the backend', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(422, { detail: 'last_channel' }))
    render(<ChannelEditor contact={contact({ channels: [channel(1), channel(2)] })} tr={tr} canWrite />)
    await user.click(screen.getAllByText('×')[0])
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_last_channel, 'error'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('adds a phone channel: submit disabled while empty, resets and refreshes afterwards', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(201, {}))
    render(<ChannelEditor contact={contact({ channels: [channel(1)] })} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) }))
    const submit = screen.getByRole('button', { name: tr.crm_channel_add }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    await user.selectOptions(screen.getByRole('combobox'), 'phone')
    await user.type(screen.getByPlaceholderText('+357 99…'), ' +35799123 ')
    expect(submit.disabled).toBe(false)
    await user.click(submit)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/5/channels')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ kind: 'phone', value: '+35799123' })
    // form collapsed again
    expect(screen.queryByPlaceholderText('+357 99…')).toBeNull()
  })

  it('keeps the add form open on a duplicate channel; cancel closes it', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(422, { detail: 'duplicate_channel' }))
    render(<ChannelEditor contact={contact({ channels: [channel(1)] })} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'dup@x.io')
    await user.click(screen.getByRole('button', { name: tr.crm_channel_add }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_duplicate_channel, 'error'))
    expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(screen.queryByPlaceholderText('name@example.com')).toBeNull()
  })
})

// ─── ContactDetailActions ───────────────────────────────────────────────────────

describe('ContactDetailActions', () => {
  const lastCall = () => {
    const [url, init] = mockFetch.mock.calls.at(-1)!
    return { url, body: JSON.parse(init.body) }
  }

  it('terminal states offer no actions and explain why', () => {
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'HARD_OPTOUT' })} tr={tr} me={superadmin} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(tr.crm_terminal_state.replace('{state}', tr.crm_state_HARD_OPTOUT))).toBeTruthy()
  })

  it('editors without lifecycle permission only get the suppress action', () => {
    render(<ContactDetailActions contact={contact()} tr={tr} me={editor([])} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([tr.crm_action_suppress])
  })

  it('confirm business needs a dialog confirmation and carries the optimistic-lock version', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactDetailActions contact={contact()} tr={tr} me={editor(['crm:lifecycle:write'])} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_confirm_business }))
    expect(mockFetch).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.crm_action_confirm_business }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(lastCall()).toEqual({
      url: '/api/admin/crm/contacts/5/confirm-business',
      body: { version: 3, legal_basis: 'legitimate_interest' },
    })
  })

  it('does not offer confirm-business when the org is already confirmed', () => {
    const c = contact()
    c.org.business_status = 'confirmed'
    render(<ContactDetailActions contact={c} tr={tr} me={superadmin} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_confirm_business })).toBeNull()
  })

  it('cancelling the confirm dialog sends nothing', async () => {
    const user = userEvent.setup()
    render(<ContactDetailActions contact={contact()} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_confirm_business }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('lifecycle dialog lists only legal target states and submits the chosen one', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'QUEUED' })} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_set_lifecycle }))
    const dialog = screen.getByRole('dialog')
    const save = within(dialog).getByRole('button', { name: tr.save }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    const options = within(dialog).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)
    expect(options).toEqual(['', 'CONTACTED', 'UNREACHABLE', 'HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD'])
    await user.selectOptions(within(dialog).getByRole('combobox'), 'CONTACTED')
    await user.click(save)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(lastCall()).toEqual({ url: '/api/admin/crm/contacts/5/lifecycle', body: { to_state: 'CONTACTED', version: 3 } })
  })

  it('does not refresh when the backend refuses the transition', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(422, { detail: 'illegal_transition' }))
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'QUEUED' })} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_set_lifecycle }))
    await user.selectOptions(screen.getByRole('combobox'), 'DEAD')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_illegal_transition, 'error'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('register from INTERESTED asks for a shop id and sends it as a number', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'INTERESTED' })} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_register }))
    const dialog = screen.getByRole('dialog')
    const submit = within(dialog).getByRole('button', { name: tr.crm_action_register }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    await user.type(within(dialog).getByLabelText(new RegExp(tr.crm_register_shop_id)), '42')
    await user.click(submit)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(lastCall().body).toEqual({ to_state: 'REGISTERED', version: 3, shop_id: 42 })
  })

  it('register dialog cancel clears the shop id', async () => {
    const user = userEvent.setup()
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'INTERESTED' })} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_register }))
    await user.type(screen.getByLabelText(new RegExp(tr.crm_register_shop_id)), '42')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.cancel }))
    await user.click(screen.getByRole('button', { name: tr.crm_action_register }))
    expect((screen.getByLabelText(new RegExp(tr.crm_register_shop_id)) as HTMLInputElement).value).toBe('')
  })

  it('only superadmins get the direct SOURCED -> REGISTERED button', () => {
    const { unmount } = render(<ContactDetailActions contact={contact()} tr={tr} me={superadmin} />)
    expect(screen.getByRole('button', { name: tr.crm_action_register_direct })).toBeTruthy()
    unmount()
    render(<ContactDetailActions contact={contact()} tr={tr} me={editor(null)} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_register_direct })).toBeNull()
  })

  it('suppress defaults to hard opt-out, can switch reason and posts it', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactDetailActions contact={contact()} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_suppress }))
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText(tr.crm_suppress_reason_hard_optout) as HTMLInputElement).checked).toBe(true)
    await user.click(within(dialog).getByLabelText(tr.crm_suppress_reason_rejected_private))
    await user.click(within(dialog).getByRole('button', { name: tr.crm_action_suppress }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(lastCall()).toEqual({ url: '/api/admin/crm/contacts/5/suppress', body: { reason: 'rejected_private', version: 3 } })
  })

  it('NEEDS_REVIEW with a card image: confirm card (-> SOURCED) and reject as private', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'NEEDS_REVIEW', card_image_front_url: 'k' })} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_confirm_card }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(lastCall().body).toEqual({ to_state: 'SOURCED', version: 3 })
    await user.click(screen.getByRole('button', { name: tr.crm_action_reject_private }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
    expect(lastCall()).toEqual({ url: '/api/admin/crm/contacts/5/suppress', body: { reason: 'rejected_private', version: 3 } })
  })

  it('NEEDS_REVIEW without card image hides confirm-card; without suppress_override hides reject', () => {
    render(<ContactDetailActions contact={contact({ lifecycle_state: 'NEEDS_REVIEW' })} tr={tr} me={editor(['crm:lifecycle:write'])} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_confirm_card })).toBeNull()
    expect(screen.queryByRole('button', { name: tr.crm_action_reject_private })).toBeNull()
  })
})

// ─── OutreachComposer ───────────────────────────────────────────────────────────

describe('OutreachComposer', () => {
  const preview = { subject: 'Καλημέρα', body_rendered: 'Body text', placeholders: {} }

  it('warns and disables sending without an email channel', async () => {
    const user = userEvent.setup()
    render(<OutreachComposer contact={contact({ channels: [channel(1, { kind: 'sms' })] })} tr={tr} />)
    expect(screen.getByText(tr.crm_err_no_email)).toBeTruthy()
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'S')
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'B')
    expect((screen.getByRole('button', { name: tr.crm_composer_send }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('send stays disabled until subject and body are both filled', async () => {
    const user = userEvent.setup()
    render(<OutreachComposer contact={contact()} tr={tr} />)
    const send = screen.getByRole('button', { name: tr.crm_composer_send }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'S')
    expect(send.disabled).toBe(true)
    await user.type(screen.getByLabelText(tr.crm_composer_body), '   ')
    expect(send.disabled).toBe(true)
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'B')
    expect(send.disabled).toBe(false)
  })

  it('loads the preview for the selected language and fills the editable fields', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, preview))
    render(<OutreachComposer contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe('Καλημέρα'))
    expect((screen.getByLabelText(tr.crm_composer_body) as HTMLTextAreaElement).value).toBe('Body text')
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/5/outreach/preview')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ language: 'el', template_id: 'first_contact_email' })
    expect(screen.getByText(`${tr.crm_composer_preview_loaded} — EL`)).toBeTruthy()
  })

  it('switching language discards the loaded preview and loads the new language on demand', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, preview))
    render(<OutreachComposer contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await screen.findByText(/— EL/)
    await user.click(screen.getByRole('button', { name: 'Русский' }))
    expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe('')
    expect(screen.queryByText(/— EL/)).toBeNull()
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect(JSON.parse(mockFetch.mock.calls[1][1].body).language).toBe('ru'))
    await screen.findByText(/— RU/)
  })

  it('does not fill the fields when the preview fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(502, {}))
    render(<OutreachComposer contact={contact()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_send_failed, 'error'))
    expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe('')
  })

  it('sends trimmed text with an idempotency key, refreshes and rotates the key afterwards', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, { message_id: 1, delivery_status: 'queued' }))
    render(<OutreachComposer contact={contact()} tr={tr} />)
    await user.type(screen.getByLabelText(tr.crm_composer_subject), ' Hi ')
    await user.type(screen.getByLabelText(tr.crm_composer_body), ' Text ')
    const keyBefore = screen.getByText(/^key:/).textContent!
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/crm/contacts/5/outreach/send')
    expect(body).toMatchObject({ language: 'el', subject: 'Hi', body: 'Text' })
    expect(keyBefore).toContain(body.idempotency_key)
    expect(screen.getByText(tr.crm_composer_already_sent)).toBeTruthy()
    expect(screen.getByText(/^key:/).textContent).not.toContain(body.idempotency_key)
  })

  it('a failed send keeps the same idempotency key so a retry cannot double-send', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(res(502, {})).mockResolvedValueOnce(res(200, { message_id: 1, delivery_status: 'sent' }))
    render(<OutreachComposer contact={contact()} tr={tr} />)
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'Hi')
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'Text')
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_send_failed, 'error'))
    expect(screen.queryByText(tr.crm_composer_already_sent)).toBeNull()
    expect(refresh).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const k1 = JSON.parse(mockFetch.mock.calls[0][1].body).idempotency_key
    const k2 = JSON.parse(mockFetch.mock.calls[1][1].body).idempotency_key
    expect(k1).toBe(k2)
  })
})
