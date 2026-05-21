import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/shops/new',
  useParams: () => ({}),
}))

vi.mock('@/components/system-admin/OpeningHoursEditor', () => ({
  OpeningHoursEditor: () => <div data-testid="opening-hours-editor" />,
}))
vi.mock('@/components/system-admin/LocationEditor', () => ({
  LocationEditor: () => <div data-testid="location-editor" />,
}))
vi.mock('@/components/ui/SocialLinksEditor', () => ({
  SocialLinksEditor: ({ onValidChange }: { onValidChange: (v: boolean) => void }) => {
    onValidChange(true)
    return <div data-testid="social-links-editor" />
  },
}))
vi.mock('@/components/system-admin/Toast', () => ({
  showToast: vi.fn(),
}))
vi.mock('@/components/ui/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}))

import { ShopForm } from '@/components/system-admin/ShopForm'
import { tSysAdmin } from '@/lib/system-admin-translations'

const TR = tSysAdmin('en')

const SHOP_TYPES = [{ id: 1, canonical: 'supermarket', translations: { en: 'Supermarket' }, name: 'Supermarket', created_at: '2026-01-01T00:00:00Z' }] as import('@/types/system-admin').SysAdminShopType[]

describe('ShopForm — create mode', () => {
  it('renders slug field in create mode (regression: 422 wegen fehlendem slug)', () => {
    render(<ShopForm shop={null} shopTypes={SHOP_TYPES} tr={TR} />)
    const slugInput = document.querySelector('input[name="slug"]')
    expect(slugInput, 'Slug-Feld muss im Create-Mode vorhanden sein').not.toBeNull()
  })

  it('auto-generates slug from name input', () => {
    render(<ShopForm shop={null} shopTypes={SHOP_TYPES} tr={TR} />)
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My Test Shop' } })
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement
    expect(slugInput.value).toBe('my-test-shop')
  })

  it('slug stays manual after user edits it', () => {
    render(<ShopForm shop={null} shopTypes={SHOP_TYPES} tr={TR} />)
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement
    fireEvent.change(slugInput, { target: { value: 'custom-slug' } })
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    expect(slugInput.value).toBe('custom-slug')
  })

  it('shows slug validation error when slug is empty on submit', async () => {
    render(<ShopForm shop={null} shopTypes={SHOP_TYPES} tr={TR} />)
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Some Shop' } })
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement
    fireEvent.change(slugInput, { target: { value: '' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(screen.getByText('Slug is required')).toBeDefined()
  })

  it('payload includes slug on submit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 99, slug: 'test-shop', status: 'active', names: { en: 'Test' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    render(<ShopForm shop={null} shopTypes={SHOP_TYPES} tr={TR} />)
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Test Shop' } })
    fireEvent.submit(document.querySelector('form')!)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalled()
    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.slug).toBe('test-shop')
    fetchSpy.mockRestore()
  })
})

describe('ShopForm — edit mode', () => {
  const EXISTING_SHOP = {
    id: 42,
    slug: 'existing-shop',
    status: 'active',
    names: { en: 'Existing Shop' },
    descriptions: null,
    address_line1: null,
    address_line2: null,
    city: null,
    postal_code: null,
    country_code: 'CY',
    lat: null,
    lng: null,
    phone: null,
    phone_alt: null,
    whatsapp_number: null,
    email: null,
    website_url: null,
    webshop_url: null,
    social_links: null,
    opening_hours: null,
    spoken_languages: [],
    delivery_services: null,
    has_parking: null,
    has_own_delivery: null,
    is_online_only: false,
    sells_live_animals: null,
    images: null,
    shop_type_id: null,
    source: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as import('@/types/system-admin').SysAdminShop

  it('does not show slug field in edit mode', () => {
    render(<ShopForm shop={EXISTING_SHOP} shopTypes={SHOP_TYPES} tr={TR} />)
    const slugInput = document.querySelector('input[name="slug"]')
    expect(slugInput, 'Slug-Feld darf im Edit-Mode nicht angezeigt werden').toBeNull()
  })

  it('payload does not include slug in edit mode', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...EXISTING_SHOP }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    render(<ShopForm shop={EXISTING_SHOP} shopTypes={SHOP_TYPES} tr={TR} />)
    fireEvent.submit(document.querySelector('form')!)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalled()
    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.slug, 'Slug darf im PATCH-Payload nicht enthalten sein').toBeUndefined()
    fetchSpy.mockRestore()
  })
})
