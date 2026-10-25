// CRM organisation components (F7600 CRM-Backbone, org cut: T15 org components).
// Backend answers are the recorded files of e2e/fixtures/contracts/crm-orgs (src/tests/helpers/crm-recorded.ts), never
// hand-written bodies. Where a test needs a state the recording does not contain (e.g. lead status NEEDS_REVIEW), it
// derives it from a recorded answer by changing exactly that field.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { CrmLeadState, CrmOrgDetail, SysAdminUser } from '@/types/system-admin'
import { recorded, rec } from './helpers/crm-recorded'
import { errorBody } from './helpers/crm-fixtures'

const push = vi.fn()
const back = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, refresh, replace: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))

import { showToast } from '@/components/system-admin/Toast'
import { crmRequest, crmPost, crmPatch, crmDelete } from '@/components/system-admin/crm/crmFetch'
import { OrgForm } from '@/components/system-admin/crm/OrgForm'
import { OrgEditForm } from '@/components/system-admin/crm/OrgEditForm'
import { OrgList } from '@/components/system-admin/crm/OrgList'
import { OrgLeadActions } from '@/components/system-admin/crm/OrgLeadActions'
import { OrgParentSection } from '@/components/system-admin/crm/OrgParentSection'
import { ChannelEditor } from '@/components/system-admin/crm/ChannelEditor'
import { ChannelList } from '@/components/system-admin/crm/ChannelList'
import { InteractionTimeline } from '@/components/system-admin/crm/InteractionTimeline'
import { LifecycleBadge, leadStateLabel } from '@/components/system-admin/crm/LifecycleBadge'
import { CardImageViewer } from '@/components/system-admin/crm/CardImageViewer'
import { ManualInteractionForm } from '@/components/system-admin/crm/ManualInteractionForm'
import { OutreachComposer } from '@/components/system-admin/crm/OutreachComposer'
import { ReviewList } from '@/components/system-admin/crm/ReviewList'
import { allowedTransitions, isTerminalLeadState } from '@/components/system-admin/crm/transitions'

const mockFetch = vi.fn()
const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')

/** Response-like answer for `fetch`. */
const res = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => { if (body === undefined) throw new Error('no body'); return body },
})
/** The recorded answer `name` as fetch result. */
const answer = (name: string) => { const r = recorded(name); return res(r.status, r.body) }
const call = (i: number) => {
  const [url, init] = mockFetch.mock.calls[i]
  return { url: url as string, method: init?.method as string | undefined, body: init?.body ? JSON.parse(init.body) : undefined }
}
const lastCall = () => call(mockFetch.mock.calls.length - 1)

beforeEach(() => {
  push.mockReset(); back.mockReset(); refresh.mockReset(); mockFetch.mockReset()
  vi.mocked(showToast).mockClear()
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

const superadmin: SysAdminUser = { id: 1, email: 'a@b.io', role: 'superadmin', permissions: null }
const editor = (permissions: string[] | null): SysAdminUser => ({ id: 2, email: 'e@b.io', role: 'editor', permissions })
/** Recorded org detail with another lead status (derived variant for states the recording does not contain). */
const withState = (org: CrmOrgDetail, state: CrmLeadState | null): CrmOrgDetail => ({ ...org, lead: { ...org.lead, state } })

// ─── crmFetch (generic) ─────────────────────────────────────────────────────────

describe('crmRequest', () => {
  it('returns parsed JSON on success and sends a JSON body', async () => {
    mockFetch.mockResolvedValue(res(201, { id: 9 }))
    const r = await crmPost<{ id: number }>('crm/orgs', { a: 1 }, tr)
    expect(r).toEqual({ ok: true, data: { id: 9 }, status: 201 })
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/crm/orgs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}',
    })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('DELETE sends no body and tolerates an empty 204 response; PATCH works like POST', async () => {
    mockFetch.mockResolvedValueOnce(res(204))
    expect(await crmDelete('crm/orgs/1/channels/2', tr)).toEqual({ ok: true, data: undefined, status: 204 })
    expect(mockFetch.mock.calls[0][1].body).toBeUndefined()
    mockFetch.mockResolvedValueOnce(res(200, {}))
    await crmPatch('crm/orgs/1', { x: 1 }, tr)
    expect(mockFetch.mock.calls[1][1].method).toBe('PATCH')
  })

  it.each([
    [403, 'crm_err_forbidden'],
    [409, 'crm_err_conflict'],
    [502, 'crm_err_send_failed'],
    [500, 'crm_err_generic'],
  ] as const)('status %i maps to its own toast', async (status, key) => {
    mockFetch.mockResolvedValue(res(status, {}))
    const r = await crmRequest('POST', 'x', {}, tr)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(status)
    expect(showToast).toHaveBeenCalledWith(tr[key], 'error')
  })

  it('recorded 404 org_not_found shows the not-found toast and returns the code', async () => {
    mockFetch.mockResolvedValue(answer('org-not-found'))
    const r = await crmRequest('POST', 'x', {}, tr)
    expect(r).toMatchObject({ ok: false, status: 404, code: 'org_not_found' })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_not_found, 'error')
  })

  it('network errors toast and report failure without a status', async () => {
    mockFetch.mockRejectedValue(new Error('down'))
    expect(await crmRequest('POST', 'x', {}, tr)).toEqual({ ok: false })
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_generic, 'error')
  })
})

// ─── Lead status: transitions and badge ─────────────────────────────────────────

describe('lead status transitions and badge', () => {
  it('mirror the backend state machine: empty status, REGISTERED terminal, early states may become UNREACHABLE', () => {
    expect(allowedTransitions(null)).toEqual(['SOURCED', 'HARD_OPTOUT', 'REJECTED_PRIVATE'])
    expect(allowedTransitions('REGISTERED')).toEqual([])
    expect(isTerminalLeadState('REGISTERED')).toBe(true)
    expect(isTerminalLeadState(null)).toBe(false)
    for (const early of ['SOURCED', 'ENRICHED', 'NEEDS_REVIEW'] as const) expect(allowedTransitions(early)).toContain('UNREACHABLE')
    expect(allowedTransitions('CONTACTED')).toContain('REGISTERED')
    expect(allowedTransitions('QUEUED')).not.toContain('REJECTED_PRIVATE')
  })

  it('labels the empty status as "no acquisition target", never as a dash; unknown values stay raw', () => {
    expect(leadStateLabel(tr, null)).toBe(tr.crm_lead_none)
    expect(leadStateLabel(trEl, null)).toBe(trEl.crm_lead_none)
    expect(leadStateLabel(tr, 'QUEUED')).toBe(tr.crm_state_QUEUED)
    expect(leadStateLabel(tr, 'FUTURE')).toBe('FUTURE')
    render(<LifecycleBadge state={null} stateLabel={tr.crm_lead_none} />)
    expect(screen.getByText(tr.crm_lead_none).getAttribute('data-lead-state')).toBe('none')
  })
})

// ─── OrgList ────────────────────────────────────────────────────────────────────

describe('OrgList', () => {
  const list = rec.orgList()
  const base = { orgs: list.items, total: list.total, page: 1, limit: 50, q: '', leadState: '', leadOnly: false, tr }

  it('shows name and lead status in every row (empty status = "no acquisition target"), contacts and branch (AC 26)', async () => {
    const user = userEvent.setup()
    render(<OrgList {...base} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(list.items.length)
    list.items.forEach((org, i) => {
      expect(within(rows[i]).getByRole('link', { name: org.name }).getAttribute('href')).toBe(`/admin/crm/orgs/${org.id}`)
      expect(within(rows[i]).getByText(leadStateLabel(tr, org.lead_state))).toBeTruthy()
      expect(within(rows[i]).queryByText('—')).toBeNull()
    })
    const plain = list.items.findIndex((o) => o.lead_state === null)
    expect(plain).toBeGreaterThanOrEqual(0)
    expect(within(rows[plain]).getByText(tr.crm_lead_none)).toBeTruthy()
    const branch = list.items.findIndex((o) => o.parent !== null)
    expect(within(rows[branch]).getByText(tr.crm_org_branch_of.replace('{name}', list.items[branch].parent!.name))).toBeTruthy()
    expect(within(rows[branch]).getByText(String(list.items[branch].contact_count))).toBeTruthy()
    expect(within(rows[branch]).getByText(list.items[branch].primary_email!)).toBeTruthy()
    await user.click(rows[branch])
    expect(push).toHaveBeenCalledWith(`/admin/crm/orgs/${list.items[branch].id}`)
  })

  it('"only acquisition targets": the recorded lead_only answer has no empty status; the chip toggles the filter', () => {
    const leadOnly = rec.orgListLeadOnly()
    expect(leadOnly.items.length).toBeGreaterThan(0)
    expect(leadOnly.items.every((o) => o.lead_state !== null)).toBe(true)
    const { rerender } = render(<OrgList {...base} q="kyma" leadState="QUEUED" />)
    expect(screen.getByRole('link', { name: tr.crm_filter_lead_only }).getAttribute('href'))
      .toBe('/admin/crm/orgs?q=kyma&lead_state=QUEUED&lead_only=true')
    expect(screen.getByRole('link', { name: tr.crm_filter_all }).getAttribute('href')).toBe('/admin/crm/orgs?q=kyma')
    rerender(<OrgList {...base} orgs={leadOnly.items} leadOnly />)
    expect(screen.getByRole('link', { name: tr.crm_filter_lead_only }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('link', { name: tr.crm_filter_lead_only }).getAttribute('href')).toBe('/admin/crm/orgs')
    expect(screen.getByRole('link', { name: tr.crm_state_DEAD }).getAttribute('href')).toBe('/admin/crm/orgs?lead_state=DEAD&lead_only=true')
    expect(screen.queryByText(tr.crm_lead_none)).toBeNull()
  })

  it('shows the empty state and paginates with the filters kept', () => {
    const { rerender } = render(<OrgList {...base} orgs={[]} total={0} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
    expect(screen.queryByText(tr.next)).toBeNull()
    rerender(<OrgList {...base} total={120} page={2} q="x" leadOnly />)
    expect(screen.getByText(tr.prev).getAttribute('href')).toBe('/admin/crm/orgs?q=x&lead_only=true&page=1')
    expect(screen.getByText(tr.next).getAttribute('href')).toBe('/admin/crm/orgs?q=x&lead_only=true&page=3')
    expect(screen.getByText(`${tr.showing} 51–100 ${tr.of} 120`)).toBeTruthy()
  })

  it('renders Greek column and filter labels', () => {
    render(<OrgList {...base} tr={trEl} />)
    expect(screen.getByText(trEl.crm_col_lead_state)).toBeTruthy()
    expect(screen.getByRole('link', { name: trEl.crm_filter_lead_only })).toBeTruthy()
  })
})

// ─── OrgForm ────────────────────────────────────────────────────────────────────

describe('OrgForm', () => {
  const nameField = () => screen.getByLabelText(new RegExp(`^${tr.crm_form_org_name}`))

  it('an acquisition target needs an email or phone; a blank name is refused', async () => {
    const user = userEvent.setup()
    render(<OrgForm tr={tr} />)
    await user.type(nameField(), 'Acme')
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    expect(await screen.findByText(tr.crm_form_contact_required)).toBeTruthy()
    await user.clear(nameField())
    await user.type(nameField(), '   ')
    await user.type(screen.getByLabelText(tr.crm_form_email), 'a@b.io')
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    expect(await screen.findByText(tr.error_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('creates the organisation with channels and source and opens it (recorded 201)', async () => {
    const user = userEvent.setup()
    const created = recorded<CrmOrgDetail>('org-create')
    mockFetch.mockResolvedValue(res(created.status, created.body))
    render(<OrgForm tr={tr} />)
    await user.type(nameField(), ' Alpha Bakery ')
    await user.type(screen.getByLabelText(tr.crm_detail_legal_name), 'Alpha Bakery Ltd')
    await user.type(screen.getByLabelText(tr.crm_form_email), 'info@alpha.example')
    await user.type(screen.getByLabelText(tr.crm_form_phone), '+35722000000')
    await user.type(screen.getByLabelText(tr.crm_form_city), 'Larnaca')
    await user.selectOptions(screen.getByLabelText(tr.crm_form_source), 'referral')
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/crm/orgs/${created.body.id}`))
    expect(call(0)).toEqual({
      url: '/api/admin/crm/orgs',
      method: 'POST',
      body: {
        name: 'Alpha Bakery', legal_name: 'Alpha Bakery Ltd', city: 'Larnaca', category: null, as_lead: true,
        channels: [{ kind: 'email', value: 'info@alpha.example' }, { kind: 'phone', value: '+35722000000' }],
        source: { source: 'referral' },
      },
    })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('plain master data (no acquisition target) needs no channel and is sent with as_lead false', async () => {
    const user = userEvent.setup()
    const created = recorded<CrmOrgDetail>('org-create-no-lead')
    mockFetch.mockResolvedValue(res(created.status, created.body))
    render(<OrgForm tr={tr} />)
    await user.type(nameField(), 'Beta Tax Office')
    await user.click(screen.getByLabelText(new RegExp(tr.crm_org_form_as_lead.replace(/[()]/g, '.'))))
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/crm/orgs/${created.body.id}`))
    expect(call(0).body).toMatchObject({ as_lead: false, channels: [] })
    expect(created.body.lead.state).toBeNull()
  })

  it('200 = an existing organisation was enriched: says so, then opens it', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, rec.orgDetail()))
    render(<OrgForm tr={tr} />)
    await user.type(nameField(), 'Alpha')
    await user.type(screen.getByLabelText(tr.crm_form_phone), '+35722000000')
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/crm/orgs/${rec.orgDetail().id}`))
    expect(showToast).toHaveBeenCalledWith(tr.crm_org_enriched, 'info')
  })

  it('stays on the form when the backend refuses; cancel goes back', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(422, errorBody('suppressed', { channel_kind: 'phone' })))
    render(<OrgForm tr={tr} />)
    await user.type(nameField(), 'Acme')
    await user.type(screen.getByLabelText(tr.crm_form_phone), '+35799')
    await user.click(screen.getByRole('button', { name: tr.crm_org_form_submit }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_suppressed, 'error'))
    expect(push).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: tr.cancel }))
    expect(back).toHaveBeenCalled()
  })
})

// ─── OrgEditForm and OrgParentSection (head office, one level) ─────────────────

describe('OrgEditForm', () => {
  it('is collapsed until edit is pressed; PATCHes master data only and leaves an unchanged head office out', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    mockFetch.mockResolvedValue(answer('org-patch-parent'))
    render(<OrgEditForm org={org} tr={tr} />)
    expect(screen.queryByText(tr.crm_org_edit_title)).toBeNull()
    await user.click(screen.getByRole('button', { name: tr.edit }))
    expect((screen.getByLabelText(tr.crm_form_city) as HTMLInputElement).value).toBe(org.city)
    await user.clear(screen.getByLabelText(tr.crm_form_city))
    await user.type(screen.getByLabelText(tr.crm_detail_region), 'Larnaca District')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({
      url: `/api/admin/crm/orgs/${org.id}`,
      method: 'PATCH',
      body: { name: org.name, legal_name: org.legal_name, city: null, region: 'Larnaca District', category: org.category },
    })
    expect(showToast).toHaveBeenCalledWith(tr.crm_org_saved, 'success')
  })

  it('assigns a head office through the org type-ahead (only candidates without own head office, never itself)', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetailNoLead()
    const hits = rec.orgSearchParentCandidates()
    mockFetch.mockImplementation(async (url: string) => (url.includes('/orgs/search') ? res(200, hits) : answer('org-patch-parent')))
    render(<OrgEditForm org={org} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    await user.click(screen.getByRole('button', { name: new RegExp(`^${tr.crm_parent_none}`) }))
    await user.type(screen.getByRole('textbox', { name: tr.crm_parent_belongs_to }), '2026')
    await user.click(await screen.findByRole('option', { name: new RegExp(hits.items[1].name) }))
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const search = call(0).url
    expect(search).toContain('/api/admin/crm/orgs/search?q=2026')
    expect(search).toContain('parent_candidates_only=true')
    expect(search).toContain(`exclude_id=${org.id}`)
    expect(lastCall().body.parent_org_id).toBe(hits.items[1].id)
  })

  it('shows the backend refusal of a second level under the field (recorded 422 org_parent_has_parent)', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    mockFetch.mockResolvedValue(answer('org-parent-has-parent'))
    render(<OrgEditForm org={org} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    await user.click(screen.getByRole('button', { name: tr.crm_parent_clear }))
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect((await screen.findByRole('alert')).textContent).toBe(tr.crm_err_org_parent_has_parent)
    expect(call(0).body.parent_org_id).toBeNull()
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByText(tr.crm_org_edit_title)).toBeTruthy()
  })

  it('an organisation with branches gets a hint instead of the head office field; blank name is refused', async () => {
    const user = userEvent.setup()
    render(<OrgEditForm org={rec.orgDetailHead()} tr={tr} />)
    await user.click(screen.getByRole('button', { name: tr.edit }))
    expect(screen.getByText(tr.crm_parent_has_children_hint)).toBeTruthy()
    expect(screen.queryByRole('button', { name: new RegExp(`^${tr.crm_parent_none}`) })).toBeNull()
    const name = screen.getByLabelText(new RegExp(`^${tr.crm_form_org_name}`))
    await user.clear(name)
    await user.type(name, '  ')
    await user.click(screen.getByRole('button', { name: tr.save }))
    expect(await screen.findByText(tr.error_required)).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('OrgParentSection', () => {
  it('branch: "Belongs to" with link to the head office (AC 42)', () => {
    const org = rec.orgDetail()
    render(<OrgParentSection org={org} tr={tr} />)
    expect(screen.getByRole('link', { name: org.parent!.name }).getAttribute('href')).toBe(`/admin/crm/orgs/${org.parent!.id}`)
    expect(screen.getByRole('link', { name: org.parent!.name }).closest('p')!.textContent).toBe(`${tr.crm_parent_belongs_to}: ${org.parent!.name}`)
  })

  it('head office: "Branches (1)" with links; nothing for an organisation that is neither', () => {
    const head = rec.orgDetailHead()
    const { container, rerender } = render(<OrgParentSection org={head} tr={tr} />)
    expect(screen.getByText(tr.crm_parent_branches.replace('{n}', '1'))).toBeTruthy()
    expect(screen.getByRole('link', { name: head.children.items[0].name }).getAttribute('href')).toBe(`/admin/crm/orgs/${head.children.items[0].id}`)
    rerender(<OrgParentSection org={{ ...head, children: { count: 101, items: head.children.items } }} tr={tr} />)
    expect(screen.getByText(tr.crm_parent_more.replace('{n}', '100'))).toBeTruthy()
    rerender(<OrgParentSection org={rec.orgDetailNoLead()} tr={tr} />)
    expect(container.firstChild).toBeNull()
  })
})

// ─── ChannelEditor (owner-neutral) and ChannelList ──────────────────────────────

describe('ChannelEditor', () => {
  const org = rec.orgDetail()
  const orgOwner = { type: 'org' as const, id: org.id }
  const maria = org.relations.find((r) => r.roles.includes('owner'))!
  const relationOwner = { type: 'relation' as const, id: maria.id }

  it('read-only: kind, value, tier, origin; no remove, add or move controls', () => {
    render(<ChannelEditor owner={orgOwner} channels={org.channels} tr={tr} canWrite={false} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(org.channels.length)
    const mail = org.channels.find((c) => c.kind === 'email')!
    const row = rows[org.channels.indexOf(mail)]
    expect(within(row).getByText(tr.crm_channel_kind_email)).toBeTruthy()
    expect(within(row).getByText(mail.value_normalized)).toBeTruthy()
    expect(within(row).getByText(tr.crm_tier_green)).toBeTruthy()
    expect(within(row).getByText(mail.origin!)).toBeTruthy()
    expect(screen.queryByText('×')).toBeNull()
    expect(screen.queryByText(new RegExp(tr.crm_channel_add))).toBeNull()
    expect(screen.queryByRole('button', { name: tr.crm_channel_move })).toBeNull()
  })

  it('an organisation without channels still offers the add form', () => {
    render(<ChannelEditor owner={{ type: 'org', id: 1 }} channels={[]} tr={tr} canWrite />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) })).toBeTruthy()
  })

  it('removes an org channel via DELETE on the org route and refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, org))
    const mail = org.channels.find((c) => c.kind === 'email')!
    render(<ChannelEditor owner={orgOwner} channels={org.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: `${tr.crm_channel_remove}: ${mail.value_normalized}` }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toMatchObject({ url: `/api/admin/crm/orgs/${org.id}/channels/${mail.id}`, method: 'DELETE' })
  })

  it('last channel (recorded 422): dialog instead of toast; confirming removes with mark_unreachable (AC 13)', async () => {
    const user = userEvent.setup()
    const head = rec.orgDetailHead()
    mockFetch.mockResolvedValueOnce(answer('org-channel-remove-last')).mockResolvedValueOnce(res(200, head))
    const only = head.channels[0]
    render(<ChannelEditor owner={{ type: 'org', id: head.id }} channels={head.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: `${tr.crm_channel_remove}: ${only.value_normalized}` }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(tr.crm_last_channel_dialog)).toBeTruthy()
    expect(showToast).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: tr.crm_last_channel_confirm }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(1)).toMatchObject({ url: `/api/admin/crm/orgs/${head.id}/channels/${only.id}?mark_unreachable=true`, method: 'DELETE' })
  })

  it('cancelling the last-channel dialog sends nothing more', async () => {
    const user = userEvent.setup()
    const head = rec.orgDetailHead()
    mockFetch.mockResolvedValueOnce(answer('org-channel-remove-last'))
    render(<ChannelEditor owner={{ type: 'org', id: head.id }} channels={head.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: `${tr.crm_channel_remove}: ${head.channels[0].value_normalized}` }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: tr.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('adds a WhatsApp channel to the organisation (recorded 201) and resets the form', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(answer('org-channel-add'))
    render(<ChannelEditor owner={orgOwner} channels={org.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) }))
    const submit = screen.getByRole('button', { name: tr.crm_channel_add }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    await user.selectOptions(screen.getByLabelText(tr.crm_channel_kind), 'whatsapp')
    await user.type(screen.getByLabelText(tr.crm_channel_value), ' +35799000001 ')
    await user.click(submit)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/orgs/${org.id}/channels`, method: 'POST', body: { kind: 'whatsapp', value: '+35799000001' } })
    expect(screen.queryByLabelText(tr.crm_channel_value)).toBeNull()
  })

  it('409 channel_exists_same_person (recorded): dialog "keep as personal channel" moves the one row to the person (AC 9)', async () => {
    const user = userEvent.setup()
    const conflict = recorded<{ detail: { channel_id: number } }>('relation-channel-exists-same-person')
    mockFetch.mockResolvedValueOnce(res(conflict.status, conflict.body)).mockResolvedValueOnce(answer('channel-move-to-person'))
    render(<ChannelEditor owner={relationOwner} personId={maria.person.id} channels={maria.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) }))
    await user.type(screen.getByLabelText(tr.crm_channel_value), 'maria@beta.example')
    await user.click(screen.getByRole('button', { name: tr.crm_channel_add }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(tr.crm_err_channel_exists_same_person)).toBeTruthy()
    expect(showToast).not.toHaveBeenCalled()
    expect(call(0).url).toBe(`/api/admin/crm/relations/${maria.id}/channels`)
    await user.click(within(dialog).getByRole('button', { name: tr.crm_keep_personal }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(1)).toEqual({
      url: `/api/admin/crm/channels/${conflict.body.detail.channel_id}/move`,
      method: 'POST',
      body: { owner: { type: 'person', id: maria.person.id } },
    })
  })

  it('422 channel_owned_by_org (recorded): hint plus "choose as preferred channel of the relation" (AC 39)', async () => {
    const user = userEvent.setup()
    const conflict = recorded<{ detail: { channel_id: number } }>('relation-channel-owned-by-org')
    mockFetch.mockResolvedValueOnce(res(conflict.status, conflict.body)).mockResolvedValueOnce(answer('relation-update-preferred'))
    render(<ChannelEditor owner={relationOwner} personId={maria.person.id} channels={maria.channels} tr={tr} canWrite />)
    await user.click(screen.getByRole('button', { name: new RegExp(tr.crm_channel_add) }))
    await user.type(screen.getByLabelText(tr.crm_channel_value), 'info@alpha.example')
    await user.click(screen.getByRole('button', { name: tr.crm_channel_add }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(tr.crm_err_channel_owned_by_org)).toBeTruthy()
    await user.click(within(alert).getByRole('button', { name: tr.crm_action_use_as_preferred }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(1)).toEqual({
      url: `/api/admin/crm/relations/${maria.id}`, method: 'PATCH', body: { preferred_channel_id: conflict.body.detail.channel_id },
    })
    expect(showToast).toHaveBeenCalledWith(tr.crm_preferred_set, 'success')
  })

  it.each([['en', tr], ['el', trEl]] as const)(
    '422 channel_owned_by_other_person (recorded) shows "shared channel, keep it at the organisation" (%s, AC 10)',
    async (_lang, t) => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(answer('org-channel-owned-by-other-person'))
      render(<ChannelEditor owner={orgOwner} channels={org.channels} tr={t} canWrite />)
      await user.click(screen.getByRole('button', { name: new RegExp(t.crm_channel_add) }))
      await user.type(screen.getByLabelText(t.crm_channel_value), 'maria@alpha.example')
      await user.click(screen.getByRole('button', { name: t.crm_channel_add }))
      expect(within(await screen.findByRole('alert')).getByText(t.crm_err_channel_owned_by_other_person)).toBeTruthy()
      expect(showToast).not.toHaveBeenCalled()
      expect(refresh).not.toHaveBeenCalled()
      expect(screen.getByLabelText(t.crm_channel_value)).toBeTruthy()
    },
  )

  it('legal tier per channel with crm:lifecycle:write: PATCH /channels/{id} (recorded answer)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(answer('channel-tier-red'))
    const work = maria.channels[0]
    render(<ChannelEditor owner={relationOwner} channels={maria.channels} tr={tr} canWrite canSetTier />)
    const select = screen.getByRole('combobox', { name: `${tr.crm_detail_legal_tier}: ${work.value_normalized}` }) as HTMLSelectElement
    expect(select.value).toBe(work.legal_tier)
    await user.selectOptions(select, 'amber')
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/channels/${work.id}`, method: 'PATCH', body: { legal_tier: 'amber' } })
  })

  it('moves a channel to one of the offered owners; the current owner is never offered', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(answer('channel-move-to-person'))
    const mail = org.channels.find((c) => c.kind === 'email')!
    const targets = [
      { owner: orgOwner, label: 'same owner' },
      { owner: relationOwner, label: 'Relation of Maria' },
      { owner: { type: 'person' as const, id: maria.person.id }, label: 'Personal channel of Maria' },
    ]
    render(<ChannelEditor owner={orgOwner} channels={[mail]} tr={tr} canWrite moveTargets={targets} />)
    await user.click(screen.getByRole('button', { name: tr.crm_channel_move }))
    const box = screen.getByTestId('crm-channel-move')
    const select = within(box).getByLabelText(tr.crm_channel_move_target)
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([tr.select_placeholder, 'Relation of Maria', 'Personal channel of Maria'])
    await user.selectOptions(select, 'Personal channel of Maria')
    await user.click(within(box).getByRole('button', { name: tr.crm_channel_move }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/channels/${mail.id}/move`, method: 'POST', body: { owner: { type: 'person', id: maria.person.id } } })
  })
})

describe('ChannelList', () => {
  it('shows the empty state; lists channels with tier and marks the preferred one', () => {
    const { rerender } = render(<ChannelList channels={[]} tr={tr} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
    const maria = rec.orgDetail().relations.find((r) => r.roles.includes('owner'))!
    rerender(<ChannelList channels={maria.channels} tr={tr} preferredChannelId={maria.channels[0].id} />)
    const row = screen.getAllByRole('row')[1]
    expect(within(row).getByText(tr.crm_tier_red)).toBeTruthy()
    expect(within(row).getByText('★')).toBeTruthy()
  })
})

// ─── Timeline, card images, manual documentation ────────────────────────────────

describe('InteractionTimeline', () => {
  const org = rec.orgDetail()

  it('shows the empty state', () => {
    render(<InteractionTimeline interactions={[]} messages={[]} tr={tr} />)
    expect(screen.getByText(tr.no_items)).toBeTruthy()
  })

  it('names the recipient of a message and the contact person of an interaction (recorded org)', () => {
    render(<InteractionTimeline interactions={org.interactions} messages={org.messages} relations={org.relations} orgChannels={org.channels} tr={tr} />)
    const msg = org.messages[0]
    const relation = org.relations.find((r) => r.id === msg.relation_id)!
    expect(screen.getByTestId(`crm-message-recipient-${msg.id}`).textContent)
      .toBe(tr.crm_timeline_recipient.replace('{who}', relation.person.display_name!).replace('{kind}', tr.crm_channel_kind_email))
    expect(screen.getAllByText(tr.crm_timeline_person.replace('{name}', relation.person.display_name!)).length).toBeGreaterThan(0)
    expect(screen.getByText(msg.subject_rendered!)).toBeTruthy()
  })

  it('a message to an org channel says "Organisation"; an unknown channel is shown by its number', () => {
    const msg = org.messages[0]
    const orgMail = org.channels.find((c) => c.kind === 'email')!
    const toOrg = { ...msg, id: 101, recipient_channel_id: orgMail.id, person_id: null, relation_id: null }
    const gone = { ...msg, id: 102, recipient_channel_id: 999999, person_id: null, relation_id: null }
    render(<InteractionTimeline interactions={[]} messages={[toOrg, gone]} relations={org.relations} orgChannels={org.channels} tr={trEl} />)
    expect(screen.getByTestId('crm-message-recipient-101').textContent)
      .toBe(trEl.crm_timeline_recipient.replace('{who}', trEl.crm_owner_org).replace('{kind}', trEl.crm_channel_kind_email))
    expect(screen.getByTestId('crm-message-recipient-102').textContent)
      .toBe(trEl.crm_timeline_recipient.replace('{who}', trEl.crm_timeline_recipient_unknown.replace('{id}', '999999')).replace('{kind}', trEl.crm_channel_kind_email))
  })
})

describe('CardImageViewer', () => {
  const org = rec.orgDetail()
  const source = org.sources[0]

  it('renders nothing for a source without a card image (recorded head office source)', () => {
    const head = rec.orgDetailHead()
    expect(head.sources[0].has_card_image.front).toBe(false)
    const { container } = render(<CardImageViewer orgId={head.id} source={head.sources[0]} tr={tr} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows front and back from the source route and opens a lightbox', async () => {
    const user = userEvent.setup()
    expect(source.has_card_image).toEqual({ front: true, back: true })
    render(<CardImageViewer orgId={org.id} source={source} tr={tr} />)
    expect(screen.getByAltText(tr.crm_card_front).getAttribute('src')).toBe(`/api/v1/admin/crm/orgs/${org.id}/sources/${source.id}/card-image/front`)
    await user.click(screen.getByRole('button', { name: `${tr.crm_card_expand}: ${tr.crm_card_back}` }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_card_back })
    expect(within(dialog).getByAltText(tr.crm_card_back).getAttribute('src')).toBe(`/api/v1/admin/crm/orgs/${org.id}/sources/${source.id}/card-image/back`)
    await user.click(within(dialog).getByRole('button', { name: tr.close }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ManualInteractionForm', () => {
  it('"who at the customer" is an active relation of the org; sends relation_id (recorded 201)', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    mockFetch.mockResolvedValue(answer('org-interaction'))
    const relations = [...org.relations, { ...org.relations[0], id: 77, active: false, person: { ...org.relations[0].person, display_name: 'Ended person' } }]
    render(<ManualInteractionForm orgId={org.id} relations={relations} tr={tr} />)
    const select = screen.getByLabelText(tr.crm_doc_relation)
    expect(within(select).queryByText('Ended person')).toBeNull()
    const maria = org.relations.find((r) => r.roles.includes('owner'))!
    await user.selectOptions(select, String(maria.id))
    await user.selectOptions(screen.getByLabelText(tr.crm_doc_kind), 'call')
    await user.type(screen.getByLabelText(tr.crm_doc_content), 'Called about the offer')
    await user.click(screen.getByRole('button', { name: tr.crm_doc_submit }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0).url).toBe(`/api/admin/crm/orgs/${org.id}/interactions`)
    expect(call(0).body).toMatchObject({ kind: 'call', channel: 'phone', direction: 'in', content: 'Called about the offer', relation_id: maria.id })
    expect(showToast).toHaveBeenCalledWith(tr.crm_doc_saved, 'success')
  })
})

// ─── OrgLeadActions ─────────────────────────────────────────────────────────────

describe('OrgLeadActions', () => {
  it('empty lead status: "make acquisition target" (null -> SOURCED with lead_version); no set-status dialog', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetailNoLead()
    mockFetch.mockResolvedValue(res(200, org))
    render(<OrgLeadActions org={org} tr={tr} me={superadmin} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_set_lifecycle })).toBeNull()
    expect(screen.getByRole('button', { name: tr.crm_action_suppress })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.crm_action_make_target }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/orgs/${org.id}/lead`, method: 'POST', body: { to_state: 'SOURCED', lead_version: org.lead.version } })
  })

  it('set status lists exactly the allowed targets of the recorded state and submits the chosen one', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    expect(org.lead.state).toBe('ENRICHED')
    mockFetch.mockResolvedValue(answer('org-lead-transition'))
    render(<OrgLeadActions org={org} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_set_lifecycle }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_action_set_lifecycle })
    const options = within(dialog).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)
    expect(options).toEqual(['', 'QUEUED', 'NEEDS_REVIEW', 'REJECTED_PRIVATE', 'HARD_OPTOUT', 'UNREACHABLE'])
    await user.selectOptions(within(dialog).getByRole('combobox'), 'UNREACHABLE')
    await user.click(within(dialog).getByRole('button', { name: tr.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0).body).toEqual({ to_state: 'UNREACHABLE', lead_version: org.lead.version })
  })

  it('a stale lead_version (recorded 409 version_conflict) toasts and does not refresh', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(answer('org-lead-version-conflict'))
    render(<OrgLeadActions org={rec.orgDetail()} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_set_lifecycle }))
    await user.selectOptions(screen.getByRole('combobox'), 'QUEUED')
    await user.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('confirm business needs the dialog and carries lead_version', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    mockFetch.mockResolvedValue(res(200, org))
    render(<OrgLeadActions org={org} tr={tr} me={editor(['crm:lifecycle:write'])} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_confirm_business }))
    expect(mockFetch).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.crm_action_confirm_business }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({
      url: `/api/admin/crm/orgs/${org.id}/confirm-business`, method: 'POST',
      body: { lead_version: org.lead.version, legal_basis: 'legitimate_interest' },
    })
  })

  it('change legal tier ("Rechtsstufe ändern") posts tier, basis and lead_version to /legal (recorded answer)', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetailNoLead()
    mockFetch.mockResolvedValue(answer('org-legal'))
    render(<OrgLeadActions org={org} tr={tr} me={editor(['crm:lifecycle:write'])} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_change_legal }))
    const dialog = screen.getByRole('dialog', { name: tr.crm_action_change_legal })
    expect((within(dialog).getByLabelText(tr.crm_detail_legal_tier) as HTMLSelectElement).value).toBe(org.lead.effective_legal_tier)
    await user.selectOptions(within(dialog).getByLabelText(tr.crm_detail_legal_tier), 'red')
    await user.type(within(dialog).getByLabelText(tr.crm_legal_note), 'private mobile number')
    await user.click(within(dialog).getByRole('button', { name: tr.save }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({
      url: `/api/admin/crm/orgs/${org.id}/legal`, method: 'POST',
      body: { effective_legal_tier: 'red', effective_legal_basis: org.lead.effective_legal_basis, lead_version: org.lead.version, note: 'private mobile number' },
    })
  })

  it('permission gating: no lifecycle permission -> no lead buttons; no suppress_override -> no suppress (AC 29)', () => {
    const org = rec.orgDetail()
    const { unmount } = render(<OrgLeadActions org={org} tr={tr} me={editor([])} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    unmount()
    render(<OrgLeadActions org={org} tr={tr} me={editor(['crm:suppress_override'])} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([tr.crm_action_suppress])
  })

  it('suppress defaults to hard opt-out, can switch reason and posts it with lead_version', async () => {
    const user = userEvent.setup()
    const org = rec.orgDetail()
    mockFetch.mockResolvedValue(res(200, org))
    render(<OrgLeadActions org={org} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_suppress }))
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText(tr.crm_suppress_reason_hard_optout) as HTMLInputElement).checked).toBe(true)
    await user.click(within(dialog).getByLabelText(tr.crm_suppress_reason_rejected_private))
    await user.click(within(dialog).getByRole('button', { name: tr.crm_action_suppress }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/orgs/${org.id}/suppress`, method: 'POST', body: { reason: 'rejected_private', lead_version: org.lead.version } })
  })

  it('NEEDS_REVIEW with a card image at a source: confirm card (-> SOURCED) and reject as private', async () => {
    const user = userEvent.setup()
    const org = withState(rec.orgDetail(), 'NEEDS_REVIEW')
    mockFetch.mockResolvedValue(res(200, org))
    render(<OrgLeadActions org={org} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_confirm_card }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(lastCall().body).toEqual({ to_state: 'SOURCED', lead_version: org.lead.version })
    await user.click(screen.getByRole('button', { name: tr.crm_action_reject_private }))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
    expect(lastCall()).toMatchObject({ url: `/api/admin/crm/orgs/${org.id}/suppress`, body: { reason: 'rejected_private' } })
  })

  it('NEEDS_REVIEW without a card image hides confirm card', () => {
    const head = withState(rec.orgDetailHead(), 'NEEDS_REVIEW')
    render(<OrgLeadActions org={head} tr={tr} me={superadmin} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_confirm_card })).toBeNull()
  })

  it('register asks for a shop id (CONTACTED); superadmin gets the direct button only from SOURCED', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, {}))
    const { unmount } = render(<OrgLeadActions org={withState(rec.orgDetail(), 'CONTACTED')} tr={tr} me={superadmin} />)
    await user.click(screen.getByRole('button', { name: tr.crm_action_register }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(new RegExp(tr.crm_register_shop_id)), '42')
    await user.click(within(dialog).getByRole('button', { name: tr.crm_action_register }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(lastCall().body).toEqual({ to_state: 'REGISTERED', lead_version: rec.orgDetail().lead.version, shop_id: 42 })
    unmount()
    const head = rec.orgDetailHead()
    expect(head.lead.state).toBe('SOURCED')
    const second = render(<OrgLeadActions org={head} tr={tr} me={superadmin} />)
    expect(screen.getByRole('button', { name: tr.crm_action_register_direct })).toBeTruthy()
    second.unmount()
    render(<OrgLeadActions org={head} tr={tr} me={editor(null)} />)
    expect(screen.queryByRole('button', { name: tr.crm_action_register_direct })).toBeNull()
  })

  it('closed states offer no lead action, only the legal tier; the terminal text names the state', () => {
    render(<OrgLeadActions org={withState(rec.orgDetail(), 'HARD_OPTOUT')} tr={tr} me={superadmin} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([tr.crm_action_change_legal])
    expect(screen.getByText(tr.crm_terminal_state.replace('{state}', tr.crm_state_HARD_OPTOUT))).toBeTruthy()
  })
})

// ─── ReviewList ─────────────────────────────────────────────────────────────────

describe('ReviewList', () => {
  it('legacy case (recorded): kind, org link, former name and title; "done" resolves it (recorded answer)', async () => {
    const user = userEvent.setup()
    const page = rec.review('legacy')
    const item = page.items[0]
    mockFetch.mockResolvedValue(answer('review-resolve'))
    render(<ReviewList items={page.items} tr={tr} canWrite />)
    expect(screen.getByText(tr.crm_review_kind_legacy_contact_name)).toBeTruthy()
    expect(screen.getByRole('link', { name: item.org!.name }).getAttribute('href')).toBe(`/admin/crm/orgs/${item.org!.id}`)
    expect(screen.getByText(tr.crm_review_payload
      .replace('{name}', String(item.payload!.display_name)).replace('{title}', String(item.payload!.role_title)))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: tr.crm_review_resolve }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0)).toEqual({ url: `/api/admin/crm/review/${item.id}/resolve`, method: 'POST', body: { status: 'resolved' } })
    expect(showToast).toHaveBeenCalledWith(tr.crm_review_resolved, 'success')
  })

  it('channel owner conflict (recorded): shows the channel; "dismiss" posts dismissed', async () => {
    const user = userEvent.setup()
    const page = rec.review('channel_owner')
    mockFetch.mockResolvedValue(answer('review-resolve'))
    render(<ReviewList items={page.items} tr={tr} canWrite />)
    expect(screen.getByText(tr.crm_review_kind_channel_owner_conflict)).toBeTruthy()
    expect(screen.getByText(page.items[0].channel!.value_normalized)).toBeTruthy()
    expect(screen.getByRole('link', { name: page.items[0].person!.display_name! }).getAttribute('href')).toBe(`/admin/crm/persons/${page.items[0].person!.id}`)
    await user.click(screen.getByRole('button', { name: tr.crm_review_dismiss }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0).body).toEqual({ status: 'dismissed' })
  })

  it.each(['relations_without_role', 'persons_name_parts'] as const)('computed entries (%s, id null) cannot be resolved', (category) => {
    const page = rec.review(category)
    expect(page.items.every((i) => i.id === null)).toBe(true)
    render(<ReviewList items={page.items} tr={trEl} canWrite />)
    expect(screen.getByText(trEl.crm_review_computed_hint)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('without write permission there are no actions; an empty category says so', () => {
    const { rerender } = render(<ReviewList items={rec.review('legacy').items} tr={tr} canWrite={false} />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<ReviewList items={[]} tr={tr} canWrite />)
    expect(screen.getByText(tr.crm_review_empty)).toBeTruthy()
  })
})

// ─── OutreachComposer (recipients, preview, send; the send gate is in crm-outreach-gate.test.tsx) ──

describe('OutreachComposer', () => {
  const org = rec.orgDetail()
  const recipients = rec.recipients()
  const props = { org, recipients, tr, canSend: true, canApprove: true }
  const recipientSelect = () => screen.getByLabelText(tr.crm_outreach_recipient) as HTMLSelectElement

  it('offers the recorded recipients with person, value and owner kind; the default is preselected', () => {
    render(<OutreachComposer {...props} />)
    const def = recipients.find((r) => r.is_default)!
    expect(recipientSelect().value).toBe(String(def.channel_id))
    const labels = within(recipientSelect()).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toContain(`${tr.crm_recipient_label_org.replace('{value}', def.value)} — ${tr.crm_recipient_default}`)
    const rel = recipients.find((r) => r.owner_type === 'relation')!
    expect(labels).toContain(tr.crm_recipient_label_relation.replace('{name}', rel.person!.display_name!).replace('{value}', rel.value))
    const personal = recipients.find((r) => r.owner_type === 'person')!
    expect(labels).toContain(tr.crm_recipient_label_person.replace('{name}', personal.person!.display_name!).replace('{value}', personal.value))
    expect(screen.getByTestId('crm-outreach-tier').textContent).toBe(tr.crm_outreach_tier.replace('{tier}', tr.crm_tier_green))
    expect(screen.queryByTestId('crm-outreach-gate')).toBeNull()
  })

  it('loads the preview for the chosen recipient and language (recorded answer)', async () => {
    const user = userEvent.setup()
    const preview = rec.previewDefault()
    mockFetch.mockResolvedValue(res(200, preview))
    render(<OutreachComposer {...props} />)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe(preview.subject))
    expect(call(0)).toEqual({
      url: `/api/admin/crm/orgs/${org.id}/outreach/preview`, method: 'POST',
      body: { language: 'el', template_id: 'first_contact_email', recipient_channel_id: recipients.find((r) => r.is_default)!.channel_id },
    })
    expect(screen.getByText(`${tr.crm_composer_preview_loaded} — EL`)).toBeTruthy()
  })

  it('switching recipient or language discards the loaded preview', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(res(200, rec.previewDefault()))
    render(<OutreachComposer {...props} />)
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await screen.findByText(/— EL/)
    const personal = recipients.find((r) => r.owner_type === 'person')!
    await user.selectOptions(recipientSelect(), String(personal.channel_id))
    expect((screen.getByLabelText(tr.crm_composer_subject) as HTMLInputElement).value).toBe('')
    await user.click(screen.getByRole('button', { name: 'Русский' }))
    await user.click(screen.getByRole('button', { name: tr.crm_composer_preview }))
    await waitFor(() => expect(lastCall().body).toMatchObject({ language: 'ru', recipient_channel_id: personal.channel_id }))
  })

  it('sends with recipient_channel_id and an idempotency key, rotates the key afterwards (recorded 201)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(answer('outreach-send'))
    render(<OutreachComposer {...props} />)
    await user.type(screen.getByLabelText(tr.crm_composer_subject), ' Hi ')
    await user.type(screen.getByLabelText(tr.crm_composer_body), ' Text ')
    const keyBefore = screen.getByText(/^key:/).textContent!
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const sent = call(0)
    expect(sent.url).toBe(`/api/admin/crm/orgs/${org.id}/outreach/send`)
    expect(sent.body).toMatchObject({ language: 'el', subject: 'Hi', body: 'Text', recipient_channel_id: recipients.find((r) => r.is_default)!.channel_id })
    expect(keyBefore).toContain(sent.body.idempotency_key)
    expect(screen.getByText(/^key:/).textContent).not.toContain(sent.body.idempotency_key)
  })

  it('a failed send keeps the idempotency key', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(res(502, errorBody('smtp_failed', { message_id: 1 }))).mockResolvedValueOnce(answer('outreach-send'))
    render(<OutreachComposer {...props} />)
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'Hi')
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'Text')
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tr.crm_err_send_failed, 'error'))
    await user.click(screen.getByRole('button', { name: tr.crm_composer_send }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(call(0).body.idempotency_key).toBe(call(1).body.idempotency_key)
  })

  it('no recipient, lead status without outreach, or no crm:send: explained and sending is disabled', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<OutreachComposer {...props} recipients={[]} />)
    expect(screen.getByText(tr.crm_outreach_no_recipient)).toBeTruthy()
    unmount()
    const second = render(<OutreachComposer {...props} org={rec.orgDetailNoLead()} />)
    expect(screen.getByText(tr.crm_err_outreach_state)).toBeTruthy()
    await user.type(screen.getByLabelText(tr.crm_composer_subject), 'S')
    await user.type(screen.getByLabelText(tr.crm_composer_body), 'B')
    expect((screen.getByRole('button', { name: tr.crm_composer_send }) as HTMLButtonElement).disabled).toBe(true)
    second.unmount()
    render(<OutreachComposer {...props} canSend={false} />)
    expect(screen.getByText(tr.crm_outreach_no_permission)).toBeTruthy()
    expect((screen.getByRole('button', { name: tr.crm_composer_preview }) as HTMLButtonElement).disabled).toBe(true)
  })
})
