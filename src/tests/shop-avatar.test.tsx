/**
 * Unit tests for ShopAvatar component (F1600 – Favicons)
 *
 * ShopAvatar renders either:
 *  a) a <img> with the favicon URL, or
 *  b) a fallback circle with the shop's first name initial and a
 *     deterministic background colour based on shopId % 8.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShopAvatar } from '@/components/shop/ShopAvatar'

// ── Favicon-image path ────────────────────────────────────────────────────────

describe('ShopAvatar — favicon image', () => {
  it('renders <img> with the given favicon_url', () => {
    render(<ShopAvatar favicon_url="https://example.cy/favicon.ico" name="Example" shopId={1} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.cy/favicon.ico')
  })

  it('sets alt attribute to shop name', () => {
    render(<ShopAvatar favicon_url="https://example.cy/favicon.ico" name="My Shop" shopId={2} />)
    expect(screen.getByAltText('My Shop')).toBeInTheDocument()
  })

  it('sets alt="" when name is null', () => {
    const { container } = render(<ShopAvatar favicon_url="https://example.cy/favicon.ico" name={null} shopId={3} />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img!.getAttribute('alt')).toBe('')
  })

  it('switches to fallback when image fires onError', () => {
    const { container } = render(<ShopAvatar favicon_url="https://broken.cy/bad.ico" name="Broken Shop" shopId={4} />)
    const img = container.querySelector('img')!
    // Trigger broken image
    fireEvent.error(img)
    // <img> element gone, fallback initial visible
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})

// ── Fallback path ─────────────────────────────────────────────────────────────

describe('ShopAvatar — fallback (no favicon_url)', () => {
  it('renders fallback when favicon_url is null', () => {
    const { container } = render(<ShopAvatar favicon_url={null} name="Supermarket" shopId={10} />)
    // No <img> element — only the fallback circle div
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders fallback when favicon_url is undefined', () => {
    const { container } = render(<ShopAvatar name="Test" shopId={5} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('shows first letter uppercase from shop name', () => {
    render(<ShopAvatar favicon_url={null} name="larnaca market" shopId={7} />)
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('shows "?" when name is null', () => {
    render(<ShopAvatar favicon_url={null} name={null} shopId={8} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('shows "?" when name is empty string', () => {
    render(<ShopAvatar favicon_url={null} name="" shopId={9} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})

// ── Colour determinism ────────────────────────────────────────────────────────

describe('ShopAvatar — deterministic colours', () => {
  // Same shopId must always produce the same colour class
  it('produces same colour for the same shopId on repeated renders', () => {
    const { container: a } = render(<ShopAvatar favicon_url={null} name="A" shopId={3} />)
    const { container: b } = render(<ShopAvatar favicon_url={null} name="A" shopId={3} />)
    const divA = a.querySelector('div[role="img"]')
    const divB = b.querySelector('div[role="img"]')
    expect(divA?.className).toBe(divB?.className)
  })

  // Different shopIds must produce different colours (at least within palette range)
  it('produces different colours for shopId 0 vs 1', () => {
    const { container: a } = render(<ShopAvatar favicon_url={null} name="A" shopId={0} />)
    const { container: b } = render(<ShopAvatar favicon_url={null} name="A" shopId={1} />)
    const divA = a.querySelector('div[role="img"]')
    const divB = b.querySelector('div[role="img"]')
    expect(divA?.className).not.toBe(divB?.className)
  })

  // shopId 0 and shopId 8 wrap around to the same colour (palette has 8 entries)
  it('wraps colour palette at index 8 (8 % 8 === 0)', () => {
    const { container: a } = render(<ShopAvatar favicon_url={null} name="A" shopId={0} />)
    const { container: b } = render(<ShopAvatar favicon_url={null} name="A" shopId={8} />)
    const divA = a.querySelector('div[role="img"]')
    const divB = b.querySelector('div[role="img"]')
    expect(divA?.className).toBe(divB?.className)
  })
})

// ── Size variants ─────────────────────────────────────────────────────────────

describe('ShopAvatar — size classes', () => {
  it('applies w-8 h-8 for size="sm"', () => {
    const { container } = render(<ShopAvatar favicon_url={null} name="S" shopId={1} size="sm" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-8/)
    expect(el.className).toMatch(/h-8/)
  })

  it('applies w-10 h-10 for size="md" (default)', () => {
    const { container } = render(<ShopAvatar favicon_url={null} name="M" shopId={1} />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-10/)
    expect(el.className).toMatch(/h-10/)
  })

  it('applies w-20 h-20 for size="lg"', () => {
    const { container } = render(<ShopAvatar favicon_url={null} name="L" shopId={1} size="lg" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/w-20/)
    expect(el.className).toMatch(/h-20/)
  })
})

// ── Extra className ───────────────────────────────────────────────────────────

describe('ShopAvatar — className prop', () => {
  it('appends custom className', () => {
    const { container } = render(
      <ShopAvatar favicon_url={null} name="X" shopId={1} className="my-custom-class" />
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/my-custom-class/)
  })
})
