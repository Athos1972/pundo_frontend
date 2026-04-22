/**
 * Unit tests for ShopAvatar component (F1600 – Favicon Binary Storage)
 *
 * ShopAvatar always requests the favicon from the backend binary endpoint:
 *   GET /api/v1/shops/{shopId}/favicon?size=small|medium|large
 *
 * When the request fails (HTTP 204 No Content, 404, or network error) the
 * component falls back to a coloured circle showing the shop's first initial.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShopAvatar } from '@/components/shop/ShopAvatar'

// ── Favicon URL construction ──────────────────────────────────────────────────

describe('ShopAvatar — favicon URL', () => {
  it('builds correct API URL with size=medium for default size', () => {
    const { container } = render(<ShopAvatar name="Example" shopId={42} />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/api/v1/shops/42/favicon?size=medium')
  })

  it('builds correct API URL with size=small for size="sm"', () => {
    const { container } = render(<ShopAvatar name="S" shopId={1} size="sm" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/api/v1/shops/1/favicon?size=small')
  })

  it('builds correct API URL with size=large for size="lg"', () => {
    const { container } = render(<ShopAvatar name="L" shopId={99} size="lg" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/api/v1/shops/99/favicon?size=large')
  })

  it('sets alt attribute to shop name', () => {
    render(<ShopAvatar name="My Shop" shopId={2} />)
    const img = document.querySelector('img')
    expect(img).toHaveAttribute('alt', 'My Shop')
  })

  it('sets alt="" when name is null', () => {
    const { container } = render(<ShopAvatar name={null} shopId={3} />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img!.getAttribute('alt')).toBe('')
  })

  it('switches to fallback when image fires onError', () => {
    const { container } = render(<ShopAvatar name="Broken Shop" shopId={4} />)
    const img = container.querySelector('img')!
    fireEvent.error(img)
    // <img> gone, fallback initial visible
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})

// ── Fallback (after image error) ──────────────────────────────────────────────

describe('ShopAvatar — fallback (after image error)', () => {
  /** Renders the component and immediately fires the image error event. */
  function renderAndError(name: string | null, shopId: number, size?: 'sm' | 'md' | 'lg') {
    const { container } = render(<ShopAvatar name={name} shopId={shopId} size={size} />)
    fireEvent.error(container.querySelector('img')!)
    return container
  }

  it('shows first letter uppercase from shop name', () => {
    renderAndError('larnaca market', 7)
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('shows "?" when name is null', () => {
    renderAndError(null, 8)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('shows "?" when name is empty string', () => {
    renderAndError('', 9)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})

// ── Colour determinism ────────────────────────────────────────────────────────

describe('ShopAvatar — deterministic colours', () => {
  function getColourDiv(shopId: number) {
    const { container } = render(<ShopAvatar name="A" shopId={shopId} />)
    fireEvent.error(container.querySelector('img')!)
    return container.querySelector('div[role="img"]')
  }

  it('produces same colour for the same shopId on repeated renders', () => {
    const a = getColourDiv(3)
    const b = getColourDiv(3)
    expect(a?.className).toBe(b?.className)
  })

  it('produces different colours for shopId 0 vs 1', () => {
    const a = getColourDiv(0)
    const b = getColourDiv(1)
    expect(a?.className).not.toBe(b?.className)
  })

  it('wraps colour palette at index 8 (8 % 8 === 0)', () => {
    const a = getColourDiv(0)
    const b = getColourDiv(8)
    expect(a?.className).toBe(b?.className)
  })
})

// ── Size variants ─────────────────────────────────────────────────────────────

describe('ShopAvatar — size classes', () => {
  it('applies w-8 h-8 for size="sm"', () => {
    const { container } = render(<ShopAvatar name="S" shopId={1} size="sm" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-8/)
    expect(el.className).toMatch(/h-8/)
  })

  it('applies w-10 h-10 for size="md" (default)', () => {
    const { container } = render(<ShopAvatar name="M" shopId={1} />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-10/)
    expect(el.className).toMatch(/h-10/)
  })

  it('applies w-20 h-20 for size="lg"', () => {
    const { container } = render(<ShopAvatar name="L" shopId={1} size="lg" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-20/)
    expect(el.className).toMatch(/h-20/)
  })
})

// ── Extra className ───────────────────────────────────────────────────────────

describe('ShopAvatar — className prop', () => {
  it('appends custom className', () => {
    const { container } = render(
      <ShopAvatar name="X" shopId={1} className="my-custom-class" />
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/my-custom-class/)
  })
})
