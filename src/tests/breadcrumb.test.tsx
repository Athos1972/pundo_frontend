import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

describe('Breadcrumb', () => {
  it('renders nothing when items array is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a nav with aria-label breadcrumb', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />)
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument()
  })

  it('renders links for items with href', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shops', href: '/shops' },
          { label: 'Acme Store' },
        ]}
      />,
    )
    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toHaveAttribute('href', '/')

    const shopsLink = screen.getByRole('link', { name: 'Shops' })
    expect(shopsLink).toHaveAttribute('href', '/shops')
  })

  it('renders the last item without a link (current page)', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Acme Store' },
        ]}
      />,
    )
    // Last item is a span, not a link
    expect(screen.queryByRole('link', { name: 'Acme Store' })).toBeNull()
    expect(screen.getByText('Acme Store')).toBeInTheDocument()
  })

  it('marks the last item with aria-current="page"', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Product Name' },
        ]}
      />,
    )
    const current = screen.getByText('Product Name')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('emits a JSON-LD script tag with BreadcrumbList schema', () => {
    vi.stubEnv('SITE_URL', 'https://test.example')
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shops', href: '/shops' },
          { label: 'Acme' },
        ]}
      />,
    )
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const json = JSON.parse(script!.textContent ?? '{}')
    expect(json['@type']).toBe('BreadcrumbList')
    expect(json.itemListElement).toHaveLength(3)
    expect(json.itemListElement[0].position).toBe(1)
    expect(json.itemListElement[0].name).toBe('Home')
    expect(json.itemListElement[0].item).toBe('https://test.example/')
    expect(json.itemListElement[2].name).toBe('Acme')
    // Last item has no href → no item field
    expect(json.itemListElement[2].item).toBeUndefined()
    vi.unstubAllEnvs()
  })

  it('renders separator characters between items', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: 'Widget' },
        ]}
      />,
    )
    // Two separators for three items
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators.length).toBe(2)
  })

  it('renders a single item without links or separators', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
