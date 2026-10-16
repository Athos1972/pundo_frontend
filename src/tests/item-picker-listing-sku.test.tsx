/**
 * F5920 follow-up: ItemPickerModal hands the SKU of the chosen listing to onSelect,
 * so the offer form can show it (new listing: null; existing listing: 409 detail.sku).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/components/shop-admin/ItemCreateForm', () => ({
  ItemCreateForm: ({ onCreated }: { onCreated: (i: unknown, id: number, sku?: string | null) => void }) => (
    <button type="button" onClick={() => onCreated({ id: 9, name: 'New' }, 12, null)}>create-done</button>
  ),
}))

import { ItemPickerModal } from '@/components/shop-admin/ItemPickerModal'
import { tAdmin } from '@/lib/shop-admin-translations'

const ITEM = { id: 5, slug: 'cola', item_type: 'product', name: 'Cola', category_id: 1, ean: null, photo_url: null }
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const realFetch = global.fetch
afterEach(() => { global.fetch = realFetch })

const onSelect = vi.fn<(item: unknown, id?: number, sku?: string | null) => void>()
const onClose = vi.fn<() => void>()
beforeEach(() => { onSelect.mockClear(); onClose.mockClear() })

async function pickCola(listingResponse: () => Response | Promise<Response>) {
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.startsWith('/api/shop-admin/items')) return json(200, { items: [ITEM] })
    return listingResponse()
  }) as unknown as typeof fetch
  render(<ItemPickerModal isOpen onClose={onClose} onSelect={onSelect as never} lang="en" />)
  const search = screen.getAllByRole('textbox')[1]
  fireEvent.change(search, { target: { value: 'cola' } })
  fireEvent.click(await screen.findByText('Cola'))
  await waitFor(() => expect(onSelect).toHaveBeenCalled())
}

describe('ItemPickerModal — listing SKU', () => {
  it('201: new listing -> sku null', async () => {
    await pickCola(() => json(201, { id: 77, sku: null }))
    expect(onSelect).toHaveBeenCalledWith(ITEM, 77, null)
  })

  it('201 carrying a SKU hands it over', async () => {
    await pickCola(() => json(201, { id: 77, sku: 'P-9' }))
    expect(onSelect).toHaveBeenCalledWith(ITEM, 77, 'P-9')
  })

  it('409 listing_exists: SKU of the existing listing (nested detail)', async () => {
    await pickCola(() => json(409, { detail: { detail: 'listing_exists', shop_listing_id: 41, sku: 'P-1' } }))
    expect(onSelect).toHaveBeenCalledWith(ITEM, 41, 'P-1')
  })

  it('409 without a SKU (listing has none, or older backend) -> null', async () => {
    await pickCola(() => json(409, { detail: { detail: 'listing_exists', shop_listing_id: 41 } }))
    expect(onSelect).toHaveBeenCalledWith(ITEM, 41, null)
  })

  it('other error: item only, no listing, no SKU', async () => {
    await pickCola(() => json(500, {}))
    expect(onSelect).toHaveBeenCalledWith(ITEM)
  })

  it('newly created item: listing id with sku null', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch
    render(<ItemPickerModal isOpen onClose={onClose} onSelect={onSelect as never} lang="en" />)
    fireEvent.click(screen.getByText(`+ ${tAdmin('en').item_picker_add_new}`))
    fireEvent.click(screen.getByText('create-done'))
    expect(onSelect).toHaveBeenCalledWith({ id: 9, name: 'New' }, 12, null)
    expect(onClose).toHaveBeenCalled()
  })
})
