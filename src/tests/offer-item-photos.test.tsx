/**
 * B5900-009 — Item photo upload in the shop-admin offer flow.
 * Covers: ItemPhotoUpload (rights UI, cover badge, error mapping, multi upload, delete workaround),
 * OfferItemPhotos (load/retry/onCoverChange), OfferForm integration, i18n completeness,
 * image-resize helper, Clean Boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ItemPhotoUpload } from '@/components/shop-admin/ItemPhotoUpload'
import { OfferItemPhotos } from '@/components/shop-admin/OfferItemPhotos'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { tAdmin } from '@/lib/shop-admin-translations'
import { shopAdminOffersTranslationsMap } from '@/lib/i18n/shop-admin-offers'
import { resizeImageForUpload } from '@/lib/shop-admin-image-resize'
import type { AdminItemPhoto } from '@/types/shop-admin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/offers',
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: vi.fn() }))
vi.mock('@/components/shop-admin/PriceTierEditor', () => ({ PriceTierEditor: () => null }))
vi.mock('@/components/shop-admin/ItemPickerModal', () => ({ ItemPickerModal: () => null }))

const OWN = 42
const tr = tAdmin('en')

function photo(id: number, sort: number, shop: number | null): AdminItemPhoto {
  return { id, item_id: 1, contributed_by_shop_id: shop, url: `https://x.test/${id}.jpg`, thumbnail_url: null, sort_order: sort }
}
function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
}
function pick(files: File[]) {
  const input = screen.getByTestId('item-photo-input') as HTMLInputElement
  fireEvent.change(input, { target: { files } })
}
const jpg = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  refresh.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

describe('ItemPhotoUpload — rights UI', () => {
  it('labels own / other shop / pundo photos and limits actions to own photos', () => {
    const photos = [photo(1, 0, OWN), photo(2, 1, 7), photo(3, 2, null)]
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    expect(screen.getByText(tr.photo_from_shop)).toBeInTheDocument()
    expect(screen.getByText(tr.photo_from_other_shop)).toBeInTheDocument()
    expect(screen.getByText(tr.photo_from_pundo)).toBeInTheDocument()
    expect(screen.getByTestId('item-photo-delete-1')).toBeInTheDocument()
    expect(screen.queryByTestId('item-photo-delete-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('item-photo-delete-3')).not.toBeInTheDocument()
  })

  it('without ownShopId no photo is own', () => {
    render(<ItemPhotoUpload itemId={1} photos={[photo(1, 0, OWN)]} onChange={vi.fn()} lang="en" />)
    expect(screen.queryByTestId('item-photo-delete-1')).not.toBeInTheDocument()
    expect(screen.getByText(tr.photo_from_other_shop)).toBeInTheDocument()
  })

  it('cover badge sits on index 0 even if sort_order is not 0 (gap after delete)', () => {
    const photos = [photo(5, 3, OWN), photo(6, 4, OWN)]
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    expect(screen.getByTestId('item-photo-5')).toContainElement(screen.getByTestId('item-photo-cover-badge'))
    expect(screen.getByTestId('item-photo-cover-badge')).toHaveTextContent(tr.photo_cover_badge)
    expect(screen.queryByTestId('item-photo-set-main-5')).not.toBeInTheDocument()
    expect(screen.getByTestId('item-photo-set-main-6')).toBeInTheDocument()
  })

  it('hides set-main and shows shared hint when a foreign photo exists (A2)', () => {
    const photos = [photo(1, 0, null), photo(2, 1, OWN)]
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    expect(screen.queryByTestId('item-photo-set-main-2')).not.toBeInTheDocument()
    expect(screen.getByText(tr.photo_shared_item_hint)).toBeInTheDocument()
  })

  it('without itemId shows localized save-first message, no hard-coded English', async () => {
    render(<ItemPhotoUpload photos={[]} onChange={vi.fn()} lang="de" ownShopId={OWN} />)
    pick([jpg()])
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tAdmin('de').photo_save_item_first))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('input is multiple and has no capture attribute', () => {
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" />)
    const input = screen.getByTestId('item-photo-input')
    expect(input).toHaveAttribute('multiple')
    expect(input).not.toHaveAttribute('capture')
  })
})

describe('ItemPhotoUpload — upload error mapping', () => {
  const cases: Array<[number, unknown, string]> = [
    [400, { detail: 'File too large: 6000000 bytes' }, tr.product_photos_size_error],
    [400, { detail: 'Unsupported file type: image/gif' }, tr.product_photos_type_error],
    [409, { detail: 'max_photos_reached' }, tr.product_photos_limit_error],
    [403, { detail: 'Forbidden' }, tr.photo_not_own_error],
    [404, { detail: 'Not found' }, tr.photo_not_own_error],   // foreign listings answer 404 instead of 403
    [500, {}, tr.product_photos_upload_error],
  ]
  it.each(cases)('status %s -> mapped message', async (status, body, msg) => {
    mockFetch.mockResolvedValue(jsonRes(status, body))
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    pick([jpg()])
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(msg))
  })

  it('rejects non-image types client-side without a request', async () => {
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" />)
    pick([new File(['hi'], 'a.txt', { type: 'text/plain' })])
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.product_photos_type_error))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('network failure -> upload error', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" />)
    pick([jpg()])
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.product_photos_upload_error))
  })
})

describe('ItemPhotoUpload — multi upload', () => {
  it('uploads only as many files as free slots (3 files, 6 present -> 2 uploads + limit msg)', async () => {
    let n = 100
    mockFetch.mockImplementation(async () => jsonRes(201, photo(++n, n, OWN)))
    const existing = Array.from({ length: 6 }, (_, i) => photo(i + 1, i, OWN))
    const onChange = vi.fn()
    render(<ItemPhotoUpload itemId={1} photos={existing} onChange={onChange} lang="en" ownShopId={OWN} />)
    pick([jpg('1.jpg'), jpg('2.jpg'), jpg('3.jpg')])
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.product_photos_limit_error))
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ id: 101 }), expect.objectContaining({ id: 102 })]))
    expect(onChange.mock.calls.at(-1)![0]).toHaveLength(8)
  })

  it('does not insert an SHA duplicate (same id) twice', async () => {
    mockFetch.mockResolvedValue(jsonRes(201, photo(1, 0, OWN)))
    const onChange = vi.fn()
    render(<ItemPhotoUpload itemId={1} photos={[photo(1, 0, OWN)]} onChange={onChange} lang="en" ownShopId={OWN} />)
    pick([jpg()])
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('...')).not.toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('ItemPhotoUpload — delete / set main', () => {
  it('deleting own cover promotes next own photo via PATCH sort_order 0', async () => {
    mockFetch.mockResolvedValue(jsonRes(200, {}))
    const onChange = vi.fn()
    const photos = [photo(1, 0, OWN), photo(2, 1, OWN)]
    render(<ItemPhotoUpload itemId={9} photos={photos} onChange={onChange} lang="en" ownShopId={OWN} />)
    fireEvent.click(screen.getByTestId('item-photo-delete-1'))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/shop-admin/items/9/photos/1', { method: 'DELETE' })
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/shop-admin/items/9/photos/2', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ sort_order: 0 }) }))
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 2, sort_order: 0 })])
  })

  it('shows visible error when delete fails', async () => {
    mockFetch.mockResolvedValue(jsonRes(403, {}))
    render(<ItemPhotoUpload itemId={9} photos={[photo(1, 0, OWN)]} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    fireEvent.click(screen.getByTestId('item-photo-delete-1'))
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.photo_not_own_error))
  })

  it('shows the not-own message when delete answers 404 (foreign photo hidden behind 404)', async () => {
    mockFetch.mockResolvedValue(jsonRes(404, {}))
    render(<ItemPhotoUpload itemId={9} photos={[photo(1, 0, OWN)]} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    fireEvent.click(screen.getByTestId('item-photo-delete-1'))
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.photo_not_own_error))
  })

  it('set-main reorders and renumbers; failure shows message', async () => {
    mockFetch.mockResolvedValueOnce(jsonRes(200, {}))
    const onChange = vi.fn()
    const photos = [photo(1, 0, OWN), photo(2, 1, OWN)]
    const { unmount } = render(<ItemPhotoUpload itemId={9} photos={photos} onChange={onChange} lang="en" ownShopId={OWN} />)
    fireEvent.click(screen.getByTestId('item-photo-set-main-2'))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(onChange.mock.calls[0][0].map((p: AdminItemPhoto) => [p.id, p.sort_order])).toEqual([[2, 0], [1, 1]])
    unmount()

    mockFetch.mockResolvedValueOnce(jsonRes(500, {}))
    render(<ItemPhotoUpload itemId={9} photos={photos} onChange={vi.fn()} lang="en" ownShopId={OWN} />)
    fireEvent.click(screen.getByTestId('item-photo-set-main-2'))
    await waitFor(() => expect(screen.getByTestId('item-photo-error')).toHaveTextContent(tr.photo_set_main_error))
  })
})

describe('OfferItemPhotos', () => {
  it('loads photos from the item endpoint and renders the uploader', async () => {
    mockFetch.mockResolvedValue(jsonRes(200, { photos: [
      { id: 2, url: 'https://x.test/2.jpg', thumbnail_url: null, sort_order: 1, contributed_by_shop_id: OWN },
      { id: 1, url: 'https://x.test/1.jpg', thumbnail_url: null, sort_order: 0, contributed_by_shop_id: OWN },
    ] }))
    render(<OfferItemPhotos itemId={5} ownShopId={OWN} lang="en" />)
    await screen.findByTestId('item-photo-upload')
    expect(mockFetch).toHaveBeenCalledWith('/api/shop-admin/items/5')
    expect(screen.getByTestId('item-photo-1')).toContainElement(screen.getByTestId('item-photo-cover-badge'))
  })

  it('shows error + retry, then recovers', async () => {
    mockFetch.mockResolvedValueOnce(jsonRes(500, {})).mockResolvedValueOnce(jsonRes(200, { photos: [] }))
    render(<OfferItemPhotos itemId={5} ownShopId={OWN} lang="en" />)
    await screen.findByText(tr.photo_load_error)
    fireEvent.click(screen.getByText(tr.photo_retry))
    await screen.findByTestId('item-photo-upload')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('reports the new cover after upload and after delete', async () => {
    mockFetch.mockResolvedValueOnce(jsonRes(200, { photos: [
      { id: 1, url: 'https://x.test/1.jpg', thumbnail_url: 'https://x.test/1t.jpg', sort_order: 0, contributed_by_shop_id: OWN },
    ] }))
    const onCover = vi.fn()
    render(<OfferItemPhotos itemId={5} ownShopId={OWN} lang="en" onCoverChange={onCover} />)
    await screen.findByTestId('item-photo-upload')
    mockFetch.mockResolvedValueOnce(jsonRes(204, {}))
    fireEvent.click(screen.getByTestId('item-photo-delete-1'))
    await waitFor(() => expect(onCover).toHaveBeenCalledWith(null))
  })
})

describe('OfferForm integration', () => {
  const item = { id: 77, slug: 's', item_type: 'product', name: 'Probe', category_id: 1, ean: null, photo_url: null } as never

  it('step 2 renders item photos for the selected item (edit mode) and refreshes the server header on cover change', async () => {
    mockFetch.mockResolvedValueOnce(jsonRes(200, { photos: [
      { id: 1, url: 'https://x.test/1.jpg', thumbnail_url: null, sort_order: 0, contributed_by_shop_id: OWN },
    ] }))
    const offer = {
      id: 3, shop_listing_id: 10, title: null, description: null, price_type: 'fixed',
      price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '5.00', currency: 'EUR' }] }],
      currency: 'EUR', promo_price_type: null, promo_price_tiers: [], promo_valid_from: null,
      promo_valid_until: null, source: 'shop_manual', offer_url: null, archived: false,
      crawled_at: null, created_at: '2026-01-01T00:00:00Z',
    } as never
    render(<OfferForm offer={offer} preloadedItem={item} lang="en" ownShopId={OWN} />)
    await screen.findByTestId('item-photo-upload')
    expect(mockFetch).toHaveBeenCalledWith('/api/shop-admin/items/77')

    mockFetch.mockResolvedValueOnce(jsonRes(204, {}))
    fireEvent.click(screen.getByTestId('item-photo-delete-1'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })
})

describe('i18n completeness (B5900-009)', () => {
  const keys = ['photo_section_hint', 'photo_cover_badge', 'photo_from_other_shop', 'photo_shared_item_hint',
    'photo_save_item_first', 'photo_delete_error', 'photo_set_main_error', 'photo_not_own_error',
    'photo_load_error', 'photo_retry'] as const
  for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he'] as const) {
    it(`${lang} has all new photo keys`, () => {
      const dict = shopAdminOffersTranslationsMap[lang] as unknown as Record<string, string>
      for (const k of keys) expect(dict[k], `${lang}.${k}`).toBeTruthy()
    })
  }
})

describe('resizeImageForUpload', () => {
  it('returns small files unchanged when the image cannot be decoded (jsdom)', async () => {
    const f = jpg()
    expect(await resizeImageForUpload(f)).toBe(f)
  })
  it('returns null for oversized files that cannot be decoded', async () => {
    const f = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(f, 'size', { value: 6 * 1024 * 1024 })
    expect(await resizeImageForUpload(f)).toBeNull()
  })
})

// Clean Boundary (keine Customer-Imports in OfferItemPhotos, ItemPhotoUpload, shop-admin-image-resize):
// tests/unit/guards/shop-admin-boundary.test.ts
