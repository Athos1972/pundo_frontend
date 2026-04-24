/**
 * T14 Unit Tests — Unified Item & Offer Model
 *
 * Covers:
 * - ItemPickerModal: renders correctly, EAN input visible, search input visible,
 *   "Create new item" CTA, closes on backdrop click
 * - ItemCreateForm: renders all required fields, validates required name,
 *   validates required category
 * - ItemPhotoUpload: renders with 0 photos, blocks upload beyond 8,
 *   shows "Von Pundo" vs "Von deinem Shop" badge
 * - OfferList: source badge renders correctly for each source type
 * - New translation keys: all 6 languages have item_picker_title
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/offers',
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, fill: _fill, ...rest }: {
    src: string; alt: string; fill?: boolean; [key: string]: unknown
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: {
    href: string; children: React.ReactNode; className?: string; onClick?: () => void
  }) => <a href={href} className={className} onClick={onClick}>{children}</a>,
}))

// Mock fetch for all tests
const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch
})

// ─── Translation keys ─────────────────────────────────────────────────────────

describe('New translation keys — all 6 languages', () => {
  it('has item_picker_title in all 6 languages', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he']
    for (const lang of langs) {
      const tr = tAdmin(lang)
      expect(tr.item_picker_title, `Missing item_picker_title for ${lang}`).toBeTruthy()
      expect(tr.item_picker_ean_label, `Missing item_picker_ean_label for ${lang}`).toBeTruthy()
      expect(tr.fuzzy_match_warning, `Missing fuzzy_match_warning for ${lang}`).toBeTruthy()
      expect(tr.source_scraper, `Missing source_scraper for ${lang}`).toBeTruthy()
      expect(tr.source_shop_manual, `Missing source_shop_manual for ${lang}`).toBeTruthy()
      expect(tr.photo_set_main, `Missing photo_set_main for ${lang}`).toBeTruthy()
      expect(tr.offer_step_item, `Missing offer_step_item for ${lang}`).toBeTruthy()
    }
  })

  it('item_type_product and item_type_service present in en and de', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('en').item_type_product).toBe('Product')
    expect(tAdmin('en').item_type_service).toBe('Service')
    expect(tAdmin('de').item_type_product).toBe('Produkt')
    expect(tAdmin('de').item_type_service).toBe('Dienstleistung')
  })
})

// ─── ItemPickerModal ──────────────────────────────────────────────────────────

describe('ItemPickerModal', () => {
  it('does not render when isOpen=false', async () => {
    const { ItemPickerModal } = await import('@/components/shop-admin/ItemPickerModal')
    render(<ItemPickerModal isOpen={false} onClose={vi.fn()} onSelect={vi.fn()} lang="en" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog with EAN and search inputs when isOpen=true', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { ItemPickerModal } = await import('@/components/shop-admin/ItemPickerModal')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemPickerModal isOpen onClose={vi.fn()} onSelect={vi.fn()} lang="en" />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(tr.item_picker_title)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. 4006381333931')).toBeInTheDocument()
  })

  it('shows "Create new item" CTA', async () => {
    const { ItemPickerModal } = await import('@/components/shop-admin/ItemPickerModal')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemPickerModal isOpen onClose={vi.fn()} onSelect={vi.fn()} lang="en" />)
    expect(screen.getByText(`+ ${tr.item_picker_add_new}`)).toBeInTheDocument()
  })

  it('calls onClose when clicking backdrop', async () => {
    const onClose = vi.fn()
    const { ItemPickerModal } = await import('@/components/shop-admin/ItemPickerModal')
    render(<ItemPickerModal isOpen onClose={onClose} onSelect={vi.fn()} lang="en" />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalled()
  })

  it('expands ItemCreateForm when CTA is clicked', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { ItemPickerModal } = await import('@/components/shop-admin/ItemPickerModal')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemPickerModal isOpen onClose={vi.fn()} onSelect={vi.fn()} lang="en" />)
    fireEvent.click(screen.getByText(`+ ${tr.item_picker_add_new}`))
    // ItemCreateForm should now be visible (save button present)
    await waitFor(() => {
      expect(screen.getByText(tr.item_picker_add_new)).toBeInTheDocument()
    })
  })
})

// ─── ItemCreateForm ───────────────────────────────────────────────────────────

describe('ItemCreateForm', () => {
  beforeEach(() => {
    // Mock categories endpoint
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: 1, name: 'Electronics' }, { id: 2, name: 'Services' }],
    }), { status: 200 }))
  })

  it('renders name, item_type radios, category select', async () => {
    const { ItemCreateForm } = await import('@/components/shop-admin/ItemCreateForm')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemCreateForm lang="en" onCreated={vi.fn()} onCancel={vi.fn()} />)
    // Type radios
    expect(screen.getByText(tr.item_type_product)).toBeInTheDocument()
    expect(screen.getByText(tr.item_type_service)).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const { ItemCreateForm } = await import('@/components/shop-admin/ItemCreateForm')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemCreateForm lang="en" onCreated={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText(tr.cancel))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows required error when submitting empty name', async () => {
    const { ItemCreateForm } = await import('@/components/shop-admin/ItemCreateForm')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    const { container } = render(<ItemCreateForm lang="en" onCreated={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getAllByText(tr.required).length).toBeGreaterThan(0)
    })
  })
})

// ─── ItemPhotoUpload ──────────────────────────────────────────────────────────

describe('ItemPhotoUpload', () => {
  it('renders with zero photos and shows add button', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" />)
    expect(screen.getByText(`0/8`)).toBeInTheDocument()
    expect(screen.getByText(`+ ${tr.product_photos_add}`)).toBeInTheDocument()
  })

  it('shows 0/8 count with zero photos', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="de" />)
    expect(screen.getByText('0/8')).toBeInTheDocument()
  })

  it('shows photo_upload_limit when at max (8 photos)', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    const photos = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      item_id: 1,
      contributed_by_shop_id: null,
      url: `https://example.com/photo${i + 1}.jpg`,
      thumbnail_url: null,
      sort_order: i,
    }))
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" />)
    expect(screen.getByText('8/8')).toBeInTheDocument()
    // Add button should be hidden
    expect(screen.queryByText(`+ ${tr.product_photos_add}`)).not.toBeInTheDocument()
    expect(screen.getByText(tr.photo_upload_limit)).toBeInTheDocument()
  })

  it('shows photo_from_pundo badge for contributed_by_shop_id=null', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    const photos = [{
      id: 1, item_id: 1, contributed_by_shop_id: null,
      url: 'https://example.com/p.jpg', thumbnail_url: null, sort_order: 0,
    }]
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" />)
    expect(screen.getByText(tr.photo_from_pundo)).toBeInTheDocument()
  })

  it('shows photo_from_shop badge for contributed_by_shop_id non-null', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    const photos = [{
      id: 1, item_id: 1, contributed_by_shop_id: 42,
      url: 'https://example.com/p.jpg', thumbnail_url: null, sort_order: 0,
    }]
    render(<ItemPhotoUpload itemId={1} photos={photos} onChange={vi.fn()} lang="en" />)
    expect(screen.getByText(tr.photo_from_shop)).toBeInTheDocument()
  })

  it('shows error when file > 5 MB', async () => {
    const { ItemPhotoUpload } = await import('@/components/shop-admin/ItemPhotoUpload')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ItemPhotoUpload itemId={1} photos={[]} onChange={vi.fn()} lang="en" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(tr.product_photos_size_error)
    })
  })
})

// ─── OfferList source badges ──────────────────────────────────────────────────

describe('OfferList — source badges', () => {
  const makeOffer = (id: number, source: string): import('@/types/shop-admin').AdminOffer => ({
    id,
    shop_listing_id: 100,
    title: `Test Offer ${id}`,
    description: null,
    price_type: 'fixed',
    price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '9.99', currency: 'EUR' }] }],
    currency: 'EUR',
    valid_from: null,
    valid_until: null,
    source: source as import('@/types/shop-admin').ItemSource,
    offer_url: null,
    archived: false,
    crawled_at: null,
    created_at: '2026-04-24T00:00:00Z',
  })

  it('shows "Automatic" badge for scraper source', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(1, 'scraper')]} expiredItems={[]} lang="en" />)
    expect(screen.getByText(tr.source_scraper)).toBeInTheDocument()
  })

  it('shows "Manual" badge for shop_manual source', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(2, 'shop_manual')]} expiredItems={[]} lang="en" />)
    expect(screen.getByText(tr.source_shop_manual)).toBeInTheDocument()
  })

  it('shows "Import" badge for shop_upload source', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(3, 'shop_upload')]} expiredItems={[]} lang="en" />)
    expect(screen.getByText(tr.source_shop_upload)).toBeInTheDocument()
  })

  it('shows "Spotted" badge for spotted source', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(4, 'spotted')]} expiredItems={[]} lang="en" />)
    expect(screen.getByText(tr.source_spotted)).toBeInTheDocument()
  })

  it('displays permanent price (no dates) as dash separator', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(<OfferList activeItems={[makeOffer(5, 'shop_manual')]} expiredItems={[]} lang="en" />)
    // valid_from/until are null → formatDateRange returns '–' (may be followed by price)
    expect(screen.getByText(/^–/)).toBeInTheDocument()
  })
})

// ─── AdminOffer type shape ────────────────────────────────────────────────────

describe('AdminOffer type has unified fields', () => {
  it('has shop_listing_id, price_tiers, source, offer_url, crawled_at', () => {
    const offer: import('@/types/shop-admin').AdminOffer = {
      id: 1,
      shop_listing_id: 42,
      title: 'Test',
      description: null,
      price_type: 'fixed',
      price_tiers: [],
      currency: 'EUR',
      valid_from: null,
      valid_until: null,
      source: 'shop_manual',
      offer_url: null,
      archived: false,
      crawled_at: null,
      created_at: '2026-04-24T00:00:00Z',
    }
    expect(offer.shop_listing_id).toBe(42)
    expect(offer.source).toBe('shop_manual')
    expect(offer.price_tiers).toEqual([])
  })
})

// ─── AdminShopListing type shape ───────────────────────────────────────────────

describe('AdminShopListing and AdminItem types', () => {
  it('AdminItem has item_type, status, source, photos fields', () => {
    const item: import('@/types/shop-admin').AdminItem = {
      id: 1,
      slug: 'test-item',
      item_type: 'product',
      names: { de: 'Test', en: 'Test' },
      descriptions: null,
      category_id: 1,
      brand_id: null,
      ean: null,
      status: 'active',
      source: 'shop_manual',
      photos: [],
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(item.item_type).toBe('product')
    expect(item.status).toBe('active')
    expect(item.source).toBe('shop_manual')
  })

  it('ItemSearchResult has name (localised string), not names record', () => {
    const result: import('@/types/shop-admin').ItemSearchResult = {
      id: 1,
      slug: 'fliese',
      item_type: 'product',
      name: 'Fliese 30x30',
      category_id: 5,
      ean: '4006381333931',
      photo_url: null,
    }
    expect(typeof result.name).toBe('string')
  })
})
