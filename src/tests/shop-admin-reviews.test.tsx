// Shop portal reviews (F5930): list, card, reply editor, report dialog, nav badge.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import React from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { ShopOwnerReview, ShopOwnerReviewPage } from '@/types/shop-admin'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/shop-admin/dashboard',
}))

import { ShopReviewList } from '@/components/shop-admin/reviews/ShopReviewList'
import { SHOP_REVIEWS_SEEN_EVENT } from '@/components/shop-admin/reviews/events'
import { AdminNav } from '@/components/shop-admin/AdminNav'

const tr = tAdmin('en')
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replace(`{${k}}`, String(x)), s)

const review = (over: Partial<ShopOwnerReview> = {}): ShopOwnerReview => ({
  id: 1,
  entity: { type: 'shop', id: 3, slug: 'cafe-larnaca', name: 'Cafe Larnaca' },
  user_display_name: 'Alice', stars: 4, comment: 'Great place', photos: [], is_visible: true,
  created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
  is_new: false, reported_by_shop: false, reply: null, can_reply: true, can_report: true, ...over,
})
const reply = (over = {}) => ({ id: 7, body: 'Thank you!', created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z', is_visible: true, ...over })
const page = (items: ShopOwnerReview[], over: Partial<ShopOwnerReviewPage> = {}): ShopOwnerReviewPage => ({
  items, total: items.length, limit: 20, offset: 0, scope: 'shop', generated_at: '2026-10-16T09:00:00.000Z', ...over,
})

const fetchMock = vi.fn()
const ok = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body })
const mount = (p: ShopOwnerReviewPage, lang = 'en') =>
  render(<ShopReviewList initial={p} shopSlug="cafe-larnaca" lang={lang} tr={tAdmin(lang)} />)
const callsTo = (re: RegExp) => fetchMock.mock.calls.filter((c) => re.test(c[0] as string))

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(ok(204))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('confirm', vi.fn(() => true))
  window.confirm = vi.fn(() => true)
})
afterEach(() => vi.unstubAllGlobals())

describe('ShopReviewList — rendering', () => {
  it('renders shop reviews with stars (aria-label), date, text and the new / reported badges', () => {
    mount(page([review({ is_new: true }), review({ id: 2, user_display_name: 'Bob', reported_by_shop: true, can_report: false })]))
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getAllByRole('img', { name: fill(tr.shop_reviews_stars_aria, { n: 4 }) })).toHaveLength(2)
    expect(screen.getByText(tr.shop_reviews_badge_new)).toBeTruthy()
    expect(screen.getByText(tr.shop_reviews_badge_reported)).toBeTruthy()
    expect(screen.getAllByText('Great place')).toHaveLength(2)
  })

  it('product tab: hint on top, product link with the language prefix, no "Reply" button, report still possible', () => {
    mount(page([review({ entity: { type: 'product', id: 9, slug: 'olive-oil', name: 'Olive oil' }, can_reply: false })], { scope: 'products' }), 'de')
    const t = tAdmin('de')
    expect(screen.getByText(t.shop_reviews_products_hint)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Olive oil' }).getAttribute('href')).toBe('/de/products/olive-oil')
    expect(screen.queryByRole('button', { name: t.shop_reviews_reply_btn })).toBeNull()
    expect(screen.getByRole('button', { name: t.shop_reviews_report_btn })).toBeTruthy()
  })

  it('hidden review: dashed/dimmed, "hidden by pundo" badge and notice, no actions', () => {
    const { container } = mount(page([review({ is_visible: false, can_reply: false, can_report: false })]))
    expect(screen.getByText(tr.shop_reviews_badge_hidden)).toBeTruthy()
    expect(screen.getByText(tr.shop_reviews_hidden_notice)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('article')?.className).toContain('opacity-60')
    expect(container.querySelector('article')?.className).toContain('border-dashed')
  })

  it('reply hidden by pundo: badge + hint, neither edit nor delete', () => {
    mount(page([review({ reply: reply({ is_visible: false }), can_reply: false })]))
    expect(screen.getByText(tr.shop_reviews_badge_reply_hidden)).toBeTruthy()
    expect(screen.getByText(tr.shop_reviews_reply_hidden)).toBeTruthy()
    expect(screen.queryByRole('button', { name: tr.shop_reviews_reply_edit })).toBeNull()
    expect(screen.queryByRole('button', { name: tr.shop_reviews_reply_delete })).toBeNull()
    expect(screen.queryByRole('button', { name: tr.shop_reviews_reply_btn })).toBeNull()
  })

  it('photos use the thumbnail with a translated alt text', () => {
    mount(page([review({ photos: [{ id: 1, url: '/full.jpg', thumbnail_url: '/thumb.jpg' }, { id: 2, url: '/only.jpg', thumbnail_url: null }] })]))
    const imgs = screen.getAllByRole('img').filter((i) => i.tagName === 'IMG')
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual(['/thumb.jpg', '/only.jpg'])
    for (const i of imgs) expect(i.getAttribute('alt')).toBe(fill(tr.shop_reviews_photo_alt, { name: 'Alice' }))
  })

  it('empty state links to the public shop page /{lang}/shops/{slug}', () => {
    mount(page([]), 'el')
    const t = tAdmin('el')
    expect(screen.getByText(t.shop_reviews_empty_shop)).toBeTruthy()
    expect(screen.getByRole('link', { name: t.shop_reviews_empty_link }).getAttribute('href')).toBe('/el/shops/cafe-larnaca')
  })

  it('customer and reply texts use dir="auto" (mixed languages stay as written)', () => {
    const { container } = mount(page([review({ comment: 'مرحبا', reply: reply({ body: 'שלום' }) })]))
    for (const text of ['مرحبا', 'שלום']) expect(screen.getByText(text).getAttribute('dir')).toBe('auto')
    expect(container.querySelectorAll('[dir="auto"]').length).toBeGreaterThanOrEqual(2)
  })
})

describe('ShopReviewList — mark as seen', () => {
  it('posts mark-seen exactly once with generated_at (also after re-render) and then fires the event', async () => {
    const seen = vi.fn()
    window.addEventListener(SHOP_REVIEWS_SEEN_EVENT, seen)
    fetchMock.mockResolvedValue(ok(204))
    const p = page([review()])
    const { rerender } = mount(p)
    rerender(<ShopReviewList initial={p} shopSlug="cafe-larnaca" lang="en" tr={tr} />)
    await waitFor(() => expect(seen).toHaveBeenCalledTimes(1))
    const calls = callsTo(/mark-seen/)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe('/api/shop-admin/reviews/mark-seen')
    expect(calls[0][1].method).toBe('POST')
    expect(JSON.parse(calls[0][1].body)).toEqual({ seen_until: '2026-10-16T09:00:00.000Z' })
    expect(calls[0][1].headers['Accept-Language']).toBe('en')
    window.removeEventListener(SHOP_REVIEWS_SEEN_EVENT, seen)
  })

  it('the "new" markers stay in the loaded view', async () => {
    mount(page([review({ is_new: true })]))
    await waitFor(() => expect(callsTo(/mark-seen/)).toHaveLength(1))
    expect(screen.getByText(tr.shop_reviews_badge_new)).toBeTruthy()
  })

  it('a failing mark-seen fires no event and shows no error', async () => {
    const seen = vi.fn()
    window.addEventListener(SHOP_REVIEWS_SEEN_EVENT, seen)
    fetchMock.mockResolvedValue(ok(500))
    mount(page([review()]))
    await waitFor(() => expect(callsTo(/mark-seen/)).toHaveLength(1))
    expect(seen).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    window.removeEventListener(SHOP_REVIEWS_SEEN_EVENT, seen)
  })
})

describe('ShopReviewList — load more', () => {
  it('fetches the next 20 with scope and offset, appends them, hides the button when all are loaded', async () => {
    const first = Array.from({ length: 20 }, (_, i) => review({ id: i + 1, user_display_name: `U${i + 1}` }))
    fetchMock.mockImplementation(async (url: string) =>
      /mark-seen/.test(url) ? ok(204) : ok(200, page([review({ id: 21, user_display_name: 'U21' })], { offset: 20, total: 21 })))
    mount(page(first, { total: 21 }))
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_load_more }))
    await waitFor(() => expect(screen.getByText('U21')).toBeTruthy())
    const [url, init] = callsTo(/\?scope=/)[0]
    expect(url).toBe('/api/shop-admin/reviews?scope=shop&limit=20&offset=20')
    expect(init.headers['Accept-Language']).toBe('en')
    expect(screen.queryByRole('button', { name: tr.shop_reviews_load_more })).toBeNull()
    expect(screen.getByText('U1')).toBeTruthy()
  })

  it('shows an error and keeps the button when loading fails', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(500)))
    mount(page([review()], { total: 5 }))
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_load_more }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.shop_reviews_list_error))
    expect(screen.getByRole('button', { name: tr.shop_reviews_load_more })).toBeTruthy()
  })
})

describe('Reply editor', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_btn }))
  const field = () => screen.getByRole('textbox', { name: tr.shop_reviews_reply_label })
  const save = () => screen.getByRole('button', { name: tr.shop_reviews_reply_save }) as HTMLButtonElement

  it('save is disabled while the text is empty or only spaces; the counter follows the input', () => {
    mount(page([review()]))
    open()
    expect(save().disabled).toBe(true)
    fireEvent.change(field(), { target: { value: '   ' } })
    expect(save().disabled).toBe(true)
    fireEvent.change(field(), { target: { value: 'Hello' } })
    expect(save().disabled).toBe(false)
    expect(screen.getByText('5/1000')).toBeTruthy()
  })

  it('creates a reply: POST with trimmed body and language header, reply shows up, "Reply" button goes away', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(201, reply({ body: 'Welcome back' }))))
    mount(page([review()]))
    open()
    fireEvent.change(field(), { target: { value: '  Welcome back  ' } })
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy())
    const [url, init] = callsTo(/\/reply$/)[0]
    expect(url).toBe('/api/shop-admin/reviews/1/reply')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ body: 'Welcome back' })
    expect(init.headers['Accept-Language']).toBe('en')
    expect(screen.queryByRole('button', { name: tr.shop_reviews_reply_btn })).toBeNull()
    expect(screen.getByRole('button', { name: tr.shop_reviews_reply_edit })).toBeTruthy()
  })

  it('1001 characters: counter turns red and the 422 shows the "too long" field message (nothing is saved)', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(422, { detail: [{ type: 'string_too_long' }] })))
    mount(page([review()]))
    open()
    fireEvent.change(field(), { target: { value: 'x'.repeat(1001) } })
    expect(screen.getByText('1001/1000').className).toContain('text-red-600')
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.shop_reviews_reply_too_long))
    expect(screen.queryByText('x'.repeat(1001), { selector: 'p' })).toBeNull()
  })

  it('exactly 1000 characters are sent', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(201, reply())))
    mount(page([review()]))
    open()
    fireEvent.change(field(), { target: { value: 'y'.repeat(1000) } })
    expect(screen.getByText('1000/1000').className).not.toContain('text-red-600')
    fireEvent.click(save())
    await waitFor(() => expect(callsTo(/\/reply$/)).toHaveLength(1))
    expect(JSON.parse(callsTo(/\/reply$/)[0][1].body).body).toHaveLength(1000)
  })

  it.each([
    ['reply_exists', 'shop_reviews_err_reply_exists', 409],
    ['review_hidden', 'shop_reviews_err_review_hidden', 409],
    ['reply_hidden', 'shop_reviews_err_reply_hidden', 409],
    ['review_not_found', 'shop_reviews_err_review_not_found', 404],
  ] as const)('error code %s is shown as its translated message', async (code, key, status) => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(status, { detail: { code } })))
    mount(page([review()]))
    open()
    fireEvent.change(field(), { target: { value: 'Hi' } })
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr[key]))
  })

  it('unknown error / network failure -> generic message; the text stays in the field', async () => {
    fetchMock.mockImplementation(async (url: string) => { if (/mark-seen/.test(url)) return ok(204); throw new Error('down') })
    mount(page([review()]))
    open()
    fireEvent.change(field(), { target: { value: 'Keep me' } })
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.shop_reviews_err_generic))
    expect((field() as HTMLTextAreaElement).value).toBe('Keep me')
  })

  it('edit: PATCH with the new text, then the card shows it', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(200, reply({ body: 'New text' }))))
    mount(page([review({ reply: reply() })]))
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_edit }))
    expect((field() as HTMLTextAreaElement).value).toBe('Thank you!')
    fireEvent.change(field(), { target: { value: 'New text' } })
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByText('New text')).toBeTruthy())
    expect(callsTo(/\/reply$/)[0][1].method).toBe('PATCH')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('cancel closes the editor without a request', () => {
    mount(page([review()]))
    open()
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_cancel }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(callsTo(/\/reply$/)).toHaveLength(0)
  })

  it('delete asks for confirmation first; declining sends nothing, accepting sends DELETE and removes the reply', async () => {
    mount(page([review({ reply: reply() })]))
    window.confirm = vi.fn(() => false)
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_delete }))
    expect(window.confirm).toHaveBeenCalledWith(tr.shop_reviews_reply_delete_confirm)
    expect(callsTo(/\/reply$/)).toHaveLength(0)

    window.confirm = vi.fn(() => true)
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_delete }))
    await waitFor(() => expect(screen.queryByText('Thank you!')).toBeNull())
    expect(callsTo(/\/reply$/)[0][1].method).toBe('DELETE')
    expect(screen.getByRole('button', { name: tr.shop_reviews_reply_btn })).toBeTruthy()
  })

  it('failed delete keeps the reply and shows the error', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(409, { detail: { code: 'reply_hidden' } })))
    mount(page([review({ reply: reply() })]))
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_reply_delete }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(tr.shop_reviews_err_reply_hidden))
    expect(screen.getByText('Thank you!')).toBeTruthy()
  })
})

describe('Report dialog', () => {
  const openDialog = () => fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_report_btn }))
  const send = () => screen.getByRole('button', { name: tr.shop_reviews_report_send }) as HTMLButtonElement

  it('send stays disabled until a reason is chosen; offers the five reasons', () => {
    mount(page([review()]))
    openDialog()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByRole('radio')).toHaveLength(5)
    expect(send().disabled).toBe(true)
    fireEvent.click(screen.getByLabelText(tr.shop_reviews_report_reason_wrong_shop))
    expect(send().disabled).toBe(false)
  })

  it('sends reason and trimmed comment, then shows "reported" and offers no second report', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(201, { status: 'reported' })))
    mount(page([review()]))
    openDialog()
    fireEvent.click(screen.getByLabelText(tr.shop_reviews_report_reason_offensive))
    fireEvent.change(screen.getByLabelText(tr.shop_reviews_report_comment_label), { target: { value: '  insulting  ' } })
    fireEvent.click(send())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const [url, init] = callsTo(/\/report$/)[0]
    expect(url).toBe('/api/shop-admin/reviews/1/report')
    expect(JSON.parse(init.body)).toEqual({ reason: 'offensive', comment: 'insulting' })
    expect(screen.getByText(tr.shop_reviews_reported)).toBeTruthy()
    expect(screen.getByText(tr.shop_reviews_badge_reported)).toBeTruthy()
    expect(screen.queryByRole('button', { name: tr.shop_reviews_report_btn })).toBeNull()
  })

  it('no comment: the field is not sent at all', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(201, { status: 'reported' })))
    mount(page([review()]))
    openDialog()
    fireEvent.click(screen.getByLabelText(tr.shop_reviews_report_reason_spam))
    fireEvent.click(send())
    await waitFor(() => expect(callsTo(/\/report$/)).toHaveLength(1))
    expect(JSON.parse(callsTo(/\/report$/)[0][1].body)).toEqual({ reason: 'spam' })
  })

  it('409 already_reported counts as reported (race with a second tab)', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(409, { detail: { code: 'already_reported' } })))
    mount(page([review()]))
    openDialog()
    fireEvent.click(screen.getByLabelText(tr.shop_reviews_report_reason_legal))
    fireEvent.click(send())
    await waitFor(() => expect(screen.getByText(tr.shop_reviews_reported)).toBeTruthy())
  })

  it('other errors stay in the dialog; cancel closes it', async () => {
    fetchMock.mockImplementation(async (url: string) => (/mark-seen/.test(url) ? ok(204) : ok(409, { detail: { code: 'review_hidden' } })))
    mount(page([review()]))
    openDialog()
    fireEvent.click(screen.getByLabelText(tr.shop_reviews_report_reason_other))
    fireEvent.click(send())
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBe(tr.shop_reviews_err_review_hidden))
    fireEvent.click(screen.getByRole('button', { name: tr.shop_reviews_report_cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: tr.shop_reviews_report_btn })).toBeTruthy()
  })

  it('an already reported review shows the state and no report button', () => {
    mount(page([review({ reported_by_shop: true, can_report: false })]))
    expect(screen.getByText(tr.shop_reviews_reported)).toBeTruthy()
    expect(screen.queryByRole('button', { name: tr.shop_reviews_report_btn })).toBeNull()
  })
})

describe('AdminNav — reviews badge', () => {
  const nav = (count?: number) => render(<AdminNav tr={tr} ownerName="Olga" reviewsNewCount={count} />)
  const reviewsLink = () => screen.getAllByRole('link', { name: new RegExp(tr.nav_reviews) })[0]

  it('shows the number plus screen-reader text', () => {
    nav(3)
    expect(reviewsLink().textContent).toContain('3')
    expect(within(reviewsLink()).getByText(fill(tr.shop_reviews_nav_new_sr, { n: 3 })).className).toContain('sr-only')
  })

  it('no badge for 0 or without the prop; 100+ is capped', () => {
    const { unmount } = nav(0)
    expect(reviewsLink().textContent).not.toMatch(/\d/)
    unmount()
    const second = nav()
    expect(reviewsLink().textContent).not.toMatch(/\d/)
    second.unmount()
    nav(150)
    expect(reviewsLink().textContent).toContain('99+')
  })

  it('clears the badge when the list reports "seen" (no reload needed)', () => {
    nav(4)
    expect(reviewsLink().textContent).toContain('4')
    act(() => { window.dispatchEvent(new Event(SHOP_REVIEWS_SEEN_EVENT)) })
    expect(reviewsLink().textContent).not.toMatch(/\d/)
  })
})

describe('RTL (ar): logical classes only', () => {
  it('list, card, editor and dialog contain no physical left/right utilities', () => {
    const t = tAdmin('ar')
    const { container } = render(
      <ShopReviewList
        initial={page([review({ reply: reply(), can_reply: true, is_new: true })], { total: 5 })}
        shopSlug="x" lang="ar" tr={t}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: t.shop_reviews_report_btn }))
    fireEvent.click(screen.getByRole('button', { name: t.shop_reviews_reply_edit }))
    const html = container.innerHTML + document.body.innerHTML
    expect(html).not.toMatch(/class="[^"]*\b(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-\S*/)
    expect(html).not.toMatch(/class="[^"]*\btext-(left|right)\b/)
    expect(html).toMatch(/\b(ms|me|ps|pe|border-s|text-start)\b/)
  })
})
