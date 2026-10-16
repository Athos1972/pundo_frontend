/**
 * F5920 AK 22 — OfferForm: field "Article number (SKU)".
 * Saved with PATCH /shop-listings/{id} BEFORE the offer; a 409 sku_conflict shows a field error and nothing else is saved.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { AdminOffer } from '@/types/shop-admin'

const push = vi.fn()
const showToast = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }))
vi.mock('@/components/shop-admin/PriceTierEditor', () => ({ PriceTierEditor: () => <div /> }))
// The picker stub exposes the chosen listing: a test sets pickerSelection, the button calls onSelect like the real modal.
let pickerSelection: { listingId?: number; sku?: string | null } = {}
vi.mock('@/components/shop-admin/ItemPickerModal', () => ({
  ItemPickerModal: ({ onSelect }: { onSelect: (item: unknown, id?: number, sku?: string | null) => void }) => (
    <button type="button" onClick={() => onSelect({ id: 5, slug: 'x', item_type: 'product', name: 'Cola', category_id: 1, ean: null, photo_url: null }, pickerSelection.listingId, pickerSelection.sku)}>
      pick
    </button>
  ),
}))
vi.mock('@/components/shop-admin/OfferItemPhotos', () => ({ OfferItemPhotos: () => <div /> }))

import { OfferForm } from '@/components/shop-admin/OfferForm'

const OFFER: AdminOffer = {
  id: 7, shop_listing_id: 26920, title: null, description: null, price_type: 'on_request', price_tiers: [], currency: 'EUR',
  promo_price_type: null, promo_price_tiers: [], promo_valid_from: null, promo_valid_until: null, source: 'shop_upload',
  offer_url: null, archived: false, crawled_at: null, created_at: '2026-10-15T00:00:00Z', listing_sku: 'A-1',
}

type Call = { url: string; method: string; body: Record<string, unknown> | null }
let calls: Call[]

function mockFetch(handler: (c: Call) => Response) {
  calls = []
  global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const call: Call = { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : null }
    calls.push(call)
    return handler(call)
  }) as unknown as typeof fetch
}

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const realFetch = global.fetch
beforeEach(() => { push.mockReset(); showToast.mockReset() })
afterEach(() => { global.fetch = realFetch })

function setSku(value: string) {
  fireEvent.change(screen.getByLabelText(tAdmin('en').offer_sku_label), { target: { value } })
}

describe('OfferForm — SKU field', () => {
  it('is prefilled with the stored SKU and rendered left-to-right with its hint', () => {
    render(<OfferForm offer={OFFER} lang="en" />)
    const input = screen.getByLabelText('Article number (SKU)') as HTMLInputElement
    expect(input.value).toBe('A-1')
    expect(input.getAttribute('dir')).toBe('ltr')
    expect(input.maxLength).toBe(128)
    expect(screen.getByText(tAdmin('en').offer_sku_hint)).toBeInTheDocument()
  })

  it('changed SKU: PATCH the listing first, then save the offer (AK 22)', async () => {
    mockFetch(() => json(200, {}))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    setSku('B-200')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(calls.length).toBe(2))
    expect(calls[0]).toEqual({ url: '/api/shop-admin/shop-listings/26920', method: 'PATCH', body: { sku: 'B-200' } })
    expect(calls[1].url).toBe('/api/shop-admin/offers/7')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/offers'))
  })

  it('SKU is trimmed', async () => {
    mockFetch(() => json(200, {}))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    setSku('  B-200  ')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(calls.length).toBe(2))
    expect(calls[0].body).toEqual({ sku: 'B-200' })
  })

  it('clearing the SKU sends null (the article number is removed)', async () => {
    mockFetch(() => json(200, {}))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    setSku('')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(calls.length).toBe(2))
    expect(calls[0].body).toEqual({ sku: null })
  })

  it('unchanged SKU: no listing PATCH at all', async () => {
    mockFetch(() => json(200, {}))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].url).toBe('/api/shop-admin/offers/7')
  })

  it('409 sku_conflict: field error, error toast, the offer is NOT saved, no navigation', async () => {
    mockFetch((c) => (c.url.includes('shop-listings') ? json(409, { detail: { code: 'sku_conflict', shop_listing_id: 5 } }) : json(200, {})))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    setSku('B-200')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tAdmin('en').offer_sku_conflict))
    expect(calls).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(tAdmin('en').error_generic, 'error')
    expect(screen.getByLabelText('Article number (SKU)').getAttribute('aria-invalid')).toBe('true')
  })

  it('other SKU save error: generic field error, offer not saved', async () => {
    mockFetch((c) => (c.url.includes('shop-listings') ? json(500, {}) : json(200, {})))
    const { container } = render(<OfferForm offer={OFFER} lang="en" />)
    setSku('B-200')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tAdmin('en').error_generic))
    expect(calls).toHaveLength(1)
  })

  it('works in RTL languages (labels from the translation, input stays ltr)', () => {
    render(<OfferForm offer={OFFER} lang="ar" />)
    const input = screen.getByLabelText(tAdmin('ar').offer_sku_label)
    expect(input.getAttribute('dir')).toBe('ltr')
  })
})


describe('OfferForm — SKU in the create flow (atomic with POST /offers)', () => {
  async function pick(listingId: number, sku: string | null | undefined, lang = 'en') {
    pickerSelection = { listingId, sku }
    const view = render(<OfferForm lang={lang} />)
    fireEvent.click(screen.getByText(/^\+ /))      // opens the (stubbed) picker
    fireEvent.click(await screen.findByText('pick'))
    await screen.findByLabelText(tAdmin(lang).offer_sku_label)
    // price on request: no tier editor needed to pass the form validation
    fireEvent.change(view.container.querySelector('select')!, { target: { value: 'on_request' } })
    return view
  }
  const submit = (c: HTMLElement) => fireEvent.submit(c.querySelector('form')!)
  const offerPost = () => calls.find((c) => c.url === '/api/shop-admin/offers')!

  it('prefills the SKU of an already existing listing (from the picker)', async () => {
    await pick(77, 'P-1')
    expect((screen.getByLabelText('Article number (SKU)') as HTMLInputElement).value).toBe('P-1')
  })

  it('new listing: empty field, typing a SKU sends it in the POST body and never PATCHes the listing', async () => {
    mockFetch(() => json(201, {}))
    const { container } = await pick(77, null)
    setSku('  N-1 ')
    submit(container)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/offers'))
    expect(calls.map((c) => c.method + ' ' + c.url)).toEqual(['POST /api/shop-admin/offers'])
    expect(offerPost().body).toMatchObject({ shop_listing_id: 77, sku: 'N-1' })
  })

  it('existing SKU left as is: no sku key in the POST body (backend keeps it)', async () => {
    mockFetch(() => json(201, {}))
    const { container } = await pick(77, 'P-1')
    submit(container)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(offerPost().body).not.toHaveProperty('sku')
  })

  it('existing SKU emptied: sku null in the POST body', async () => {
    mockFetch(() => json(201, {}))
    const { container } = await pick(77, 'P-1')
    setSku('')
    submit(container)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(offerPost().body).toHaveProperty('sku', null)
  })

  it('no SKU at all: no sku key', async () => {
    mockFetch(() => json(201, {}))
    const { container } = await pick(77, undefined)
    submit(container)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(offerPost().body).not.toHaveProperty('sku')
  })

  it('409 sku_conflict from the POST: field error, toast, no navigation', async () => {
    mockFetch(() => json(409, { detail: { code: 'sku_conflict', shop_listing_id: 3 } }))
    const { container } = await pick(77, null)
    setSku('N-1')
    submit(container)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tAdmin('en').offer_sku_conflict))
    expect(push).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(tAdmin('en').error_generic, 'error')
  })

  it('rtl: input stays ltr in the create flow', async () => {
    await pick(77, 'P-1', 'ar')
    expect(screen.getByLabelText(tAdmin('ar').offer_sku_label).getAttribute('dir')).toBe('ltr')
  })
})
