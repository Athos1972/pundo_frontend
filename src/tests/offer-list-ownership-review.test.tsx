// F5970 AC 25: "To review" tab, badge, single and bulk confirm / archive, banner follows the count
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { OfferList } from '@/components/shop-admin/OfferList'
import { UnverifiedOffersBanner } from '@/components/shop-admin/UnverifiedOffersBanner'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span>{p.alt}</span> }))
const toast = vi.fn()
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }))

const tr = tAdmin('en')
const fetchMock = vi.fn()

const offer = (id: number, over: Partial<AdminOffer> = {}): AdminOffer => ({
  id, shop_listing_id: id, title: `Offer ${id}`, description: null, price_type: 'on_request', price_tiers: [], currency: 'EUR',
  promo_price_type: null, promo_price_tiers: [], promo_valid_from: null, promo_valid_until: null, source: 'shop_manual',
  offer_url: null, archived: false, crawled_at: null, created_at: '2026-10-01T00:00:00Z', ...over,
})
const flagged = (id: number) => offer(id, { ownership_review: true })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})
const reply = (body: unknown, ok = true) => fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body })

describe('tab and badge', () => {
  it('shows the "To review" tab with the count only when offers are flagged', () => {
    const first = render(<OfferList activeItems={[offer(1)]} expiredItems={[]} lang="en" />)
    expect(screen.queryByTestId('offer-tab-review')).toBeNull()
    first.unmount()
    render(<OfferList activeItems={[offer(1), flagged(2), flagged(3)]} expiredItems={[]} lang="en" />)
    expect(screen.getByTestId('offer-tab-review')).toHaveTextContent(`${tr.offer_review_tab}2`)
  })

  it('marks flagged offers with a badge in the normal list too', () => {
    render(<OfferList activeItems={[offer(1), flagged(2)]} expiredItems={[]} lang="en" />)
    const rows = screen.getAllByTestId('offer-row')
    expect(within(rows[0]).queryByTestId('offer-review-badge')).toBeNull()
    expect(within(rows[1]).getByTestId('offer-review-badge')).toHaveTextContent(tr.offer_review_badge)
  })

  it('the review tab lists only flagged offers and explains why they are hidden', () => {
    render(<OfferList activeItems={[offer(1), flagged(2)]} expiredItems={[]} lang="en" initialTab="review" />)
    expect(screen.getAllByTestId('offer-row')).toHaveLength(1)
    expect(screen.getByTestId('offer-review-panel')).toHaveTextContent(tr.offer_review_intro)
  })

  it('opens on the review tab from the banner link (?review=1)', () => {
    render(<OfferList activeItems={[flagged(2)]} expiredItems={[]} lang="en" initialTab="review" />)
    expect(screen.getByTestId('offer-tab-review').className).toContain('border-accent')
  })

  it('has no confirm actions outside the review tab', () => {
    render(<OfferList activeItems={[flagged(2)]} expiredItems={[]} lang="en" />)
    expect(screen.queryByTestId('offer-review-confirm')).toBeNull()
  })
})

describe('opening the review tab on the mounted list', () => {
  it('follows a changed initialTab prop (same-route navigation to ?review=1)', () => {
    const items = [offer(1), flagged(2)]
    const view = render(<OfferList activeItems={items} expiredItems={[]} lang="en" />)
    expect(screen.getAllByTestId('offer-row')).toHaveLength(2)
    view.rerender(<OfferList activeItems={items} expiredItems={[]} lang="en" initialTab="review" />)
    expect(screen.getAllByTestId('offer-row')).toHaveLength(1)
    expect(screen.getByTestId('offer-tab-review').className).toContain('border-accent')
  })

  it('the banner link opens the tab even when the URL already says review and the user switched away', () => {
    render(
      <>
        <UnverifiedOffersBanner count={1} tr={tr} />
        <OfferList activeItems={[offer(1), flagged(2)]} expiredItems={[]} lang="en" initialTab="review" />
      </>,
    )
    fireEvent.click(screen.getByTestId('offer-tab-active'))
    expect(screen.getAllByTestId('offer-row')).toHaveLength(2)
    fireEvent.click(screen.getByRole('link', { name: tr.offer_review_banner_link }))
    expect(screen.getAllByTestId('offer-row')).toHaveLength(1)
  })
})

describe('single actions', () => {
  it('confirm: posts the offer id, the offer leaves the review tab and stays active', async () => {
    reply({ confirmed: 1, remaining: 1 })
    render(<OfferList activeItems={[flagged(2), flagged(3)]} expiredItems={[]} lang="en" initialTab="review" />)
    fireEvent.click(within(screen.getAllByTestId('offer-row')[0]).getByTestId('offer-review-confirm'))
    await waitFor(() => expect(screen.getAllByTestId('offer-row')).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/shop-admin/offers/ownership-review/confirm', expect.objectContaining({ method: 'POST', body: JSON.stringify({ offer_ids: [2] }) }))
    expect(toast).toHaveBeenCalledWith(tr.offer_review_confirmed_toast.replace('{n}', '1'), 'success')
    fireEvent.click(screen.getByTestId('offer-tab-active'))
    expect(screen.getAllByTestId('offer-row')).toHaveLength(2) // confirmed offer is still an active offer
  })

  it('archive: posts the id, the offer moves to the archive tab', async () => {
    reply({ archived: 1, remaining: 0 })
    render(<OfferList activeItems={[flagged(2)]} expiredItems={[]} lang="en" initialTab="review" />)
    fireEvent.click(screen.getByTestId('offer-review-archive'))
    await waitFor(() => expect(screen.getByText(tr.offer_review_empty)).toBeInTheDocument())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/shop-admin/offers/ownership-review/archive')
    fireEvent.click(screen.getByTestId('offer-tab-expired'))
    expect(screen.getAllByTestId('offer-row')).toHaveLength(1)
  })

  it('shows an error toast and keeps the offer when the call fails', async () => {
    reply({}, false)
    render(<OfferList activeItems={[flagged(2)]} expiredItems={[]} lang="en" initialTab="review" />)
    fireEvent.click(screen.getByTestId('offer-review-confirm'))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(tr.error_generic, 'error'))
    expect(screen.getAllByTestId('offer-row')).toHaveLength(1)
  })
})

describe('bulk actions', () => {
  it('confirm all posts {all:true} and empties the tab', async () => {
    reply({ confirmed: 2, remaining: 0 })
    render(<OfferList activeItems={[flagged(2), flagged(3), offer(4)]} expiredItems={[]} lang="en" initialTab="review" />)
    fireEvent.click(screen.getByTestId('offer-review-confirm-all'))
    await waitFor(() => expect(screen.getByText(tr.offer_review_empty)).toBeInTheDocument())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ all: true })
  })

  it('archive all asks first (nothing is deleted), then archives', async () => {
    reply({ archived: 2, remaining: 0 })
    render(<OfferList activeItems={[flagged(2), flagged(3)]} expiredItems={[]} lang="en" initialTab="review" />)
    fireEvent.click(screen.getByTestId('offer-review-archive-all'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(tr.offer_review_archive_all_confirm.replace('{n}', '2'))).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('offer-review-archive-all-yes'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/shop-admin/offers/ownership-review/archive')
    await waitFor(() => expect(screen.getByText(tr.offer_review_empty)).toBeInTheDocument())
  })

  it('the buttons show the number of waiting offers', () => {
    render(<OfferList activeItems={[flagged(2), flagged(3), flagged(4)]} expiredItems={[]} lang="en" initialTab="review" />)
    expect(screen.getByTestId('offer-review-confirm-all')).toHaveTextContent('Confirm all (3)')
    expect(screen.getByTestId('offer-review-archive-all')).toHaveTextContent('Archive all (3)')
  })
})

describe('UnverifiedOffersBanner', () => {
  it('shows the count and links to the filtered list', () => {
    render(<UnverifiedOffersBanner count={4} tr={tr} />)
    expect(screen.getByTestId('unverified-offers-banner')).toHaveTextContent(tr.offer_review_banner.replace('{n}', '4'))
    expect(screen.getByRole('link', { name: tr.offer_review_banner_link }).getAttribute('href')).toBe('/shop-admin/offers?review=1')
  })

  it('is absent at 0', () => {
    render(<UnverifiedOffersBanner count={0} tr={tr} />)
    expect(screen.queryByTestId('unverified-offers-banner')).toBeNull()
  })

  it('follows the offer list: shrinks after a bulk action and disappears at 0', async () => {
    reply({ confirmed: 1, remaining: 1 })
    render(
      <>
        <UnverifiedOffersBanner count={2} tr={tr} />
        <OfferList activeItems={[flagged(2), flagged(3)]} expiredItems={[]} lang="en" initialTab="review" />
      </>,
    )
    expect(screen.getByTestId('unverified-offers-banner')).toHaveTextContent('2')
    fireEvent.click(within(screen.getAllByTestId('offer-row')[0]).getByTestId('offer-review-confirm'))
    // wait for the LIST first (it updates before the banner is told), then for the banner
    await waitFor(() => expect(screen.getAllByTestId('offer-row')).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('unverified-offers-banner')).toHaveTextContent(tr.offer_review_banner.replace('{n}', '1')))
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ confirmed: 1, remaining: 0 }) })
    fireEvent.click(screen.getByTestId('offer-review-confirm'))
    await waitFor(() => expect(screen.queryAllByTestId('offer-row')).toHaveLength(0))
    await waitFor(() => expect(screen.queryByTestId('unverified-offers-banner')).toBeNull())
  })

  it.each(['de', 'el', 'ru', 'ar', 'he'] as const)('is translated in %s', (lang) => {
    const t = tAdmin(lang)
    render(<UnverifiedOffersBanner count={2} tr={t} />)
    expect(screen.getByTestId('unverified-offers-banner')).toHaveTextContent(t.offer_review_banner_link)
    expect(t.offer_review_banner).not.toBe(tr.offer_review_banner)
  })
})
