import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/dashboard',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: {
    href: string; children: React.ReactNode; className?: string; onClick?: () => void
  }) => <a href={href} className={className} onClick={onClick}>{children}</a>,
}))

// ─── tAdmin ──────────────────────────────────────────────────────────────────

describe('tAdmin', () => {
  it('returns English translations for unknown lang', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('xx')
    expect(tr.login_btn).toBe('Sign in')
  })

  it('returns German translations for de', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('de')
    expect(tr.login_btn).toBe('Einloggen')
    expect(tr.register_btn).toBe('Konto erstellen')
  })

  it('returns English as fallback for missing language', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('xx').login_btn).toBe('Sign in') // unknown lang → falls back to EN
  })

  it('upload_success is a string template with {n} placeholder', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    expect(tr.upload_success.replace('{n}', '5')).toContain('5')
    expect(tr.upload_errors.replace('{n}', '3')).toContain('3')
  })

  it('days array has 7 entries', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('en').days).toHaveLength(7)
    expect(tAdmin('de').days).toHaveLength(7)
  })
})

// ─── FormField ───────────────────────────────────────────────────────────────

describe('FormField', () => {
  it('renders label and input', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(<FormField label="Email" name="email" type="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows required asterisk when required=true', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(<FormField label="Name" name="name" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('shows error message and sets aria-invalid', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(<FormField label="Email" name="email" error="This field is required." />)
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.')
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders textarea when as=textarea', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(<FormField label="Description" name="description" as="textarea" />)
    expect(screen.getByRole('textbox', { name: 'Description' }).tagName).toBe('TEXTAREA')
  })

  it('renders select when as=select', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(
      <FormField label="Category" name="cat" as="select">
        <option value="1">Cat Food</option>
      </FormField>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('no error → aria-invalid is not set', async () => {
    const { FormField } = await import('@/components/shop-admin/FormField')
    render(<FormField label="Name" name="name" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false')
  })
})

// ─── Middleware logic ─────────────────────────────────────────────────────────

describe('Middleware route matching', () => {
  // We test the PUBLIC_PATHS logic in isolation — no need for Next.js runtime
  const PUBLIC_PATHS = [
    '/shop-admin/login',
    '/shop-admin/register',
    '/shop-admin/verify-email',
  ]

  function isPublic(path: string) {
    return PUBLIC_PATHS.some((p) => path.startsWith(p))
  }

  it('login is public', () => { expect(isPublic('/shop-admin/login')).toBe(true) })
  it('register is public', () => { expect(isPublic('/shop-admin/register')).toBe(true) })
  it('verify-email is public', () => { expect(isPublic('/shop-admin/verify-email?token=abc')).toBe(true) })
  it('dashboard is protected', () => { expect(isPublic('/shop-admin/dashboard')).toBe(false) })
  it('products is protected', () => { expect(isPublic('/shop-admin/products')).toBe(false) })
  it('api-keys is protected', () => { expect(isPublic('/shop-admin/api-keys')).toBe(false) })
})

// ─── AdminNav ─────────────────────────────────────────────────────────────────

describe('AdminNav', () => {
  it('renders all nav items', async () => {
    const { AdminNav } = await import('@/components/shop-admin/AdminNav')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<AdminNav tr={tr} ownerName="Test Owner" />)
    expect(screen.getAllByText(tr.nav_dashboard).length).toBeGreaterThan(0)
    expect(screen.getAllByText(tr.nav_products).length).toBeGreaterThan(0)
    expect(screen.getAllByText(tr.nav_api_keys).length).toBeGreaterThan(0)
  })

  it('shows owner name', async () => {
    const { AdminNav } = await import('@/components/shop-admin/AdminNav')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<AdminNav tr={tAdmin('en')} ownerName="Maria Demopoulos" />)
    expect(screen.getAllByText('Maria Demopoulos').length).toBeGreaterThan(0)
  })

  it('dashboard link has bg-accent class when pathname matches', async () => {
    const { AdminNav } = await import('@/components/shop-admin/AdminNav')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<AdminNav tr={tAdmin('en')} ownerName="Owner" />)
    // usePathname mock returns '/shop-admin/dashboard'
    // Active link gets 'bg-accent text-white' class; others get 'text-gray-700'
    const dashboardLinks = screen.getAllByRole('link').filter(
      (el) => el.getAttribute('href') === '/shop-admin/dashboard'
    )
    expect(dashboardLinks.length).toBeGreaterThan(0)
    expect(dashboardLinks[0].className).toContain('bg-accent')
  })
})

// ─── HoursEditor ─────────────────────────────────────────────────────────────

describe('HoursEditor', () => {
  it('renders 7 day rows', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const hours = Array.from({ length: 7 }, (_, i) => ({
      day: i as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      open: '09:00',
      close: '18:00',
      closed: false,
    }))
    render(<HoursEditor initialHours={hours} lang="en" />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(7)
  })

  it('hides time inputs when closed is checked', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const hours = [
      { day: 0 as const, open: '09:00', close: '18:00', closed: true },
      ...Array.from({ length: 6 }, (_, i) => ({
        day: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        open: '09:00',
        close: '18:00',
        closed: false,
      })),
    ]
    render(<HoursEditor initialHours={hours} lang="en" />)
    // Monday is closed → time inputs for Mon should not be visible
    // 6 open days × 2 time inputs each = 12 time inputs
    const timeInputs = screen.getAllByDisplayValue('09:00')
    expect(timeInputs).toHaveLength(6)
  })

  it('toggles closed state when checkbox clicked', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const hours = Array.from({ length: 7 }, (_, i) => ({
      day: i as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      open: '09:00',
      close: '18:00',
      closed: false,
    }))
    render(<HoursEditor initialHours={hours} lang="en" />)
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    // After click, Monday becomes closed → one fewer set of time inputs
    const timeInputs = screen.getAllByDisplayValue('09:00')
    expect(timeInputs).toHaveLength(6)
  })
})

// ─── ProductList ──────────────────────────────────────────────────────────────

describe('ProductList', () => {
  const products = [
    { id: 1, name: 'Cat Food 2kg', category_id: 10, price: '9.99', currency: 'EUR', unit: 'kg', available: true },
    { id: 2, name: 'Dog Toys Set', category_id: 11, price: '14.99', currency: 'EUR', unit: 'pcs', available: false },
  ]

  it('renders product names', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={products} lang="en" />)
    expect(screen.getByText('Cat Food 2kg')).toBeInTheDocument()
    expect(screen.getByText('Dog Toys Set')).toBeInTheDocument()
  })

  it('shows edit links for each product', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={products} lang="en" />)
    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks).toHaveLength(2)
    expect(editLinks[0]).toHaveAttribute('href', '/shop-admin/products/1/edit')
  })

  it('shows no-results message when list is empty', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={[]} lang="en" />)
    expect(screen.getByText('No items yet.')).toBeInTheDocument()
  })

  it('shows confirm buttons before deletion', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={products} lang="en" />)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[0])
    // After click: confirm delete + cancel appear
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})

// ─── OfferList tabs ───────────────────────────────────────────────────────────

describe('OfferList', () => {
  const active = [
    { id: 1, title: 'Summer Sale', description: '', price: '5.00', valid_from: '2026-06-01', valid_until: '2026-08-31', archived: false },
  ]
  const expired = [
    { id: 2, title: 'Winter Sale', description: '', price: '3.00', valid_from: '2025-12-01', valid_until: '2026-01-31', archived: true },
  ]

  it('shows active offers by default', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(<OfferList activeItems={active} expiredItems={expired} lang="en" />)
    expect(screen.getByText('Summer Sale')).toBeInTheDocument()
    expect(screen.queryByText('Winter Sale')).not.toBeInTheDocument()
  })

  it('switches to expired tab and shows expired offers', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    render(<OfferList activeItems={active} expiredItems={expired} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Expired' }))
    expect(screen.getByText('Winter Sale')).toBeInTheDocument()
    expect(screen.queryByText('Summer Sale')).not.toBeInTheDocument()
  })
})

// ─── ApiKeyList ───────────────────────────────────────────────────────────────

describe('ApiKeyList', () => {
  const keys = [
    { id: 1, name: 'POS Integration', scope: 'read_write' as const, created_at: '2026-04-01T10:00:00Z' },
  ]

  it('renders key name and scope', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    render(<ApiKeyList initialKeys={keys} lang="en" />)
    expect(screen.getByText('POS Integration')).toBeInTheDocument()
    expect(screen.getByText(/Read & Write/)).toBeInTheDocument()
  })

  it('shows "never" for keys without last_used_at', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    render(<ApiKeyList initialKeys={keys} lang="en" />)
    expect(screen.getByText(/Never/)).toBeInTheDocument()
  })

  it('shows create form when add button clicked', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    render(<ApiKeyList initialKeys={[]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: /New API key/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows confirm before delete', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    render(<ApiKeyList initialKeys={keys} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
