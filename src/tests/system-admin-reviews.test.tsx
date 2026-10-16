// System-Admin review moderation (F5930): ReviewModerationList + /admin/reviews pages.
// Replaces ReviewModerationTable.test.tsx (the moderation moved from the shop portal to the system admin).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { SysAdminReview } from '@/types/system-admin'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-api')

import * as api from '@/lib/system-admin-api'
import { getLangServer } from '@/lib/lang'
import { ReviewModerationList } from '@/components/system-admin/ReviewModerationList'

const tr = tSysAdmin('en')
const trEl = tSysAdmin('el')

const review = (over: Partial<SysAdminReview> = {}): SysAdminReview => ({
  id: 1, user_id: 10, user_display_name: 'Alice', entity_type: 'shop', entity_id: 99,
  entity: { type: 'shop', id: 99, slug: 'cafe-larnaca', name: 'Cafe Larnaca' },
  stars: 4, comment: 'Sehr gut', photos: [], is_visible: true,
  created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
  reporter_count: 0, owner_report_count: 0, last_reported_at: null, invalidated_at: null, invalidated_by: null,
  reports: [], reply: null, ...over,
})
const reply = (over = {}) => ({
  id: 5, shop_id: 99, shop_name: 'Cafe Larnaca', body: 'Danke!', is_visible: true,
  hidden_at: null, hidden_reason: null, created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z', ...over,
})

const fetchMock = vi.fn()
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getLangServer).mockResolvedValue('en')
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
})

/** click the action, then confirm in the dialog */
async function act(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.rev_confirm_yes }))
}

describe('ReviewModerationList — render', () => {
  it('shows the entity name (linked to the public page) instead of #ID, and the empty text', () => {
    const { unmount } = render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    const link = screen.getByRole('link', { name: 'Cafe Larnaca' })
    expect(link.getAttribute('href')).toBe('/en/shops/cafe-larnaca')
    expect(screen.queryByText(/#99/)).toBeNull()
    unmount()
    render(<ReviewModerationList reviews={[]} tr={tr} />)
    expect(screen.getByText(tr.rev_empty)).toBeTruthy()
  })

  it('product entity links to /en/products; a deleted entity falls back to #ID', () => {
    const { unmount } = render(
      <ReviewModerationList reviews={[review({ entity_type: 'product', entity: { type: 'product', id: 3, slug: 'olive-oil', name: 'Olive oil' } })]} tr={tr} />,
    )
    expect(screen.getByRole('link', { name: 'Olive oil' }).getAttribute('href')).toBe('/en/products/olive-oil')
    unmount()
    render(<ReviewModerationList reviews={[review({ entity: null })]} tr={tr} />)
    expect(screen.getByText(new RegExp(`#99 \\(${tr.rev_entity_gone}\\)`))).toBeTruthy()
  })

  it('shows the report source (customer / shop owner), reason and comment', () => {
    render(
      <ReviewModerationList
        tr={tr}
        reviews={[review({
          reporter_count: 2, owner_report_count: 1,
          reports: [
            { id: 1, source: 'customer', reason: 'rude', comment: null, reporter_label: 'Bob', created_at: '2026-10-03T10:00:00Z' },
            { id: 2, source: 'shop_owner', reason: 'wrong_shop', comment: 'not ours', reporter_label: 'Cafe Larnaca', created_at: '2026-10-03T11:00:00Z' },
          ],
        })]}
      />,
    )
    expect(screen.getByText(tr.rev_badge_owner_reported)).toBeTruthy()
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain(tr.rev_source_customer)
    expect(items[0].textContent).toContain('rude')
    expect(items[1].textContent).toContain(tr.rev_source_shop_owner)
    expect(items[1].textContent).toContain(tr.rev_reason_wrong_shop) // code translated
    expect(items[1].textContent).toContain('not ours')
  })

  it('shows hidden state and the hidden reply with its reason', () => {
    render(<ReviewModerationList tr={tr} reviews={[review({ is_visible: false, reply: reply({ is_visible: false, hidden_reason: 'spam' }) })]} />)
    expect(screen.getByText(tr.rev_badge_hidden)).toBeTruthy()
    expect(screen.getByText(tr.rev_reply_hidden)).toBeTruthy()
    expect(screen.getByText('Danke!')).toBeTruthy()
    expect(screen.getByRole('button', { name: tr.rev_action_restore_reply })).toBeTruthy()
    expect(screen.getByRole('button', { name: tr.rev_action_restore })).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.rev_audit_link }).getAttribute('href')).toBe('/admin/reviews/1/audit-log')
  })

  it('Greek strings exist for every key used here', () => {
    for (const k of Object.keys(tr)) expect(Object.keys(trEl)).toContain(k)
  })
})

describe('ReviewModerationList — hide / restore review', () => {
  it('hide: confirm dialog first (nothing sent before), then POST invalidate with the reason key', async () => {
    render(<ReviewModerationList reviews={[review(), review({ id: 2, user_display_name: 'Carol' })]} tr={tr} />)
    fireEvent.click(screen.getAllByRole('button', { name: tr.rev_action_hide })[0])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.rev_confirm_yes }))
    await waitFor(() => expect(screen.getByRole('button', { name: tr.rev_action_restore })).toBeTruthy())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/reviews/1/invalidate')
    expect(JSON.parse(init.body)).toEqual({ reason: 'spam' })
    // only Alice's review changed
    expect(screen.getAllByRole('button', { name: tr.rev_action_hide })).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hide uses the selected reason', async () => {
    render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'legal' } })
    await act(tr.rev_action_hide)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: 'legal' })
  })

  it('cancel in the dialog sends nothing', () => {
    render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    fireEvent.click(screen.getByRole('button', { name: tr.rev_action_hide }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: tr.cancel }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('restore: POST /restore without body, review becomes visible again', async () => {
    render(<ReviewModerationList reviews={[review({ is_visible: false })]} tr={tr} />)
    await act(tr.rev_action_restore)
    await waitFor(() => expect(screen.getByRole('button', { name: tr.rev_action_hide })).toBeTruthy())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/reviews/1/restore')
    expect(init.body).toBeUndefined()
  })

  it('error: message, review state unchanged', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    await act(tr.rev_action_hide)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.rev_action_failed))
    expect(screen.queryByText(tr.rev_badge_hidden)).toBeNull()
    expect(screen.getByRole('button', { name: tr.rev_action_hide })).toBeTruthy()
  })

  it('network failure shows the error too', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    await act(tr.rev_action_hide)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})

describe('ReviewModerationList — hide / restore reply', () => {
  it('hide reply: POST /reply/hide with reason, reply flagged hidden, review stays visible', async () => {
    render(<ReviewModerationList reviews={[review({ reply: reply() })]} tr={tr} />)
    await act(tr.rev_action_hide_reply)
    await waitFor(() => expect(screen.getByRole('button', { name: tr.rev_action_restore_reply })).toBeTruthy())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/reviews/1/reply/hide')
    expect(JSON.parse(init.body)).toEqual({ reason: 'spam' })
    expect(screen.getByText(tr.rev_reply_hidden)).toBeTruthy()
    expect(screen.getByRole('button', { name: tr.rev_action_hide })).toBeTruthy()
  })

  it('restore reply: POST /reply/restore, reply visible again', async () => {
    render(<ReviewModerationList reviews={[review({ reply: reply({ is_visible: false, hidden_reason: 'spam' }) })]} tr={tr} />)
    await act(tr.rev_action_restore_reply)
    await waitFor(() => expect(screen.getByRole('button', { name: tr.rev_action_hide_reply })).toBeTruthy())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/reviews/1/reply/restore')
    expect(screen.queryByText(tr.rev_reply_hidden)).toBeNull()
  })

  it('no reply: no reply buttons', () => {
    render(<ReviewModerationList reviews={[review()]} tr={tr} />)
    expect(screen.queryByRole('button', { name: tr.rev_action_hide_reply })).toBeNull()
    expect(screen.queryByRole('button', { name: tr.rev_action_restore_reply })).toBeNull()
  })
})

// ─── Pages ────────────────────────────────────────────────────────────────────────

type Page = (props: never) => Promise<React.ReactElement> | React.ReactElement
async function show(Page: unknown, props: unknown = {}) {
  return render(await (Page as Page)(props as never))
}
const sp = (o: Record<string, string> = {}) => ({ searchParams: Promise.resolve(o) })
const P = '@/app/(system-admin)/admin/(portal)/reviews'

describe('/admin/reviews page', () => {
  it('defaults to the "reported" filter (has_reports) with limit 50 and the page language', async () => {
    vi.mocked(api.getReviews).mockResolvedValue([review()])
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp())
    expect(api.getReviews).toHaveBeenCalledWith({ has_reports: true, limit: 50, offset: 0 }, 'en')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(tr.rev_title)
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByRole('link', { name: tr.rev_filter_reported }).getAttribute('aria-current')).toBe('page')
  })

  it.each([
    ['owner_reported', { report_source: 'shop_owner' }],
    ['hidden', { is_visible: false }],
    ['all', {}],
    ['bogus', { has_reports: true }],
  ])('filter %s -> query %j', async (filter, expected) => {
    vi.mocked(api.getReviews).mockResolvedValue([])
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp({ filter }))
    expect(api.getReviews).toHaveBeenCalledWith({ ...expected, limit: 50, offset: 0 }, 'en')
  })

  it('paging: offset from ?page=, "next" only with a full page, "previous" from page 2', async () => {
    vi.mocked(api.getReviews).mockResolvedValue(Array.from({ length: 50 }, (_, i) => review({ id: i + 1, user_display_name: `U${i}` })))
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp({ filter: 'all', page: '2' }))
    expect(api.getReviews).toHaveBeenCalledWith({ limit: 50, offset: 50 }, 'en')
    expect(screen.getByRole('link', { name: tr.rev_next }).getAttribute('href')).toBe('/admin/reviews?filter=all&page=3')
    expect(screen.getByRole('link', { name: tr.rev_prev }).getAttribute('href')).toBe('/admin/reviews?filter=all')
  })

  it('no paging links for a short first page; empty state', async () => {
    vi.mocked(api.getReviews).mockResolvedValue([])
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp())
    expect(screen.getByText(tr.rev_empty)).toBeTruthy()
    expect(screen.queryByRole('link', { name: tr.rev_next })).toBeNull()
  })

  it('a failing backend shows the error, not an empty list', async () => {
    vi.mocked(api.getReviews).mockRejectedValue(new Error('API_ERROR:500'))
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp())
    expect(screen.getByRole('alert').textContent).toBe(tr.rev_load_error)
    expect(screen.queryByText(tr.rev_empty)).toBeNull()
  })

  it('Greek UI language is used for the labels', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    vi.mocked(api.getReviews).mockResolvedValue([])
    const { default: Page } = await import(`${P}/page`)
    await show(Page, sp())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(trEl.rev_title)
    expect(api.getReviews).toHaveBeenCalledWith(expect.anything(), 'el')
  })
})

describe('/admin/reviews/[id]/audit-log page', () => {
  const entry = (over: Record<string, unknown>) => ({
    id: 1, review_id: 77, timestamp: '2026-03-04T10:00:00Z', action: 'created', actor_type: 'customer', actor_id: 1,
    actor_ip: '1.2.3.4', reason: null, moderation_model: null, moderation_confidence: null, ...over,
  })

  it('renders action and actor labels (incl. reply_* and shop_owner), ip, reason, model; raw value for unknown ones', async () => {
    vi.mocked(api.getReviewAuditLog).mockResolvedValue([
      entry({}),
      entry({ id: 2, action: 'reply_hidden', actor_type: 'admin', actor_ip: null, reason: 'spam', moderation_model: 'gpt', moderation_confidence: 0.876 }),
      entry({ id: 3, action: 'reply_created', actor_type: 'shop_owner' }),
      entry({ id: 4, action: 'mystery', actor_type: 'alien', timestamp: 'not-a-date' }),
    ] as never)
    const { default: Page } = await import(`${P}/[id]/audit-log/page`)
    await show(Page, { params: Promise.resolve({ id: '77' }) })
    expect(api.getReviewAuditLog).toHaveBeenCalledWith('77')
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText(tr.rev_audit_action_created)).toBeTruthy()
    expect(within(rows[0]).getByText('1.2.3.4')).toBeTruthy()
    expect(within(rows[1]).getByText(tr.rev_audit_action_reply_hidden)).toBeTruthy()
    expect(within(rows[1]).getByText(tr.rev_actor_admin)).toBeTruthy()
    expect(within(rows[1]).getByText('gpt (88%)')).toBeTruthy()
    expect(within(rows[2]).getByText(tr.rev_audit_action_reply_created)).toBeTruthy()
    expect(within(rows[2]).getByText(tr.rev_actor_shop_owner)).toBeTruthy()
    expect(within(rows[3]).getByText('mystery')).toBeTruthy()
    expect(within(rows[3]).getByText('alien')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`${tr.rev_audit_title} #77`)
    expect(screen.getByRole('link', { name: new RegExp(tr.rev_audit_back) }).getAttribute('href')).toBe('/admin/reviews')
  })

  it('empty entries -> empty text, failing request -> error text', async () => {
    const { default: Page } = await import(`${P}/[id]/audit-log/page`)
    vi.mocked(api.getReviewAuditLog).mockResolvedValueOnce([])
    const { unmount } = await show(Page, { params: Promise.resolve({ id: '1' }) })
    expect(screen.getByText(tr.rev_audit_empty)).toBeTruthy()
    unmount()
    vi.mocked(api.getReviewAuditLog).mockRejectedValueOnce(new Error('down'))
    await show(Page, { params: Promise.resolve({ id: '1' }) })
    expect(screen.getByRole('alert').textContent).toBe(tr.rev_load_error)
  })
})
