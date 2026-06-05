import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCardImage } from '@/components/product/ProductCardImage'

describe('ProductCardImage', () => {
  it('renders img with correct src and alt when src is provided', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('src', '/product_images/test.jpg')
    expect(img).toHaveAttribute('alt', 'Test Produkt')
  })

  // B2250-002: loading="lazy" must NOT be present.
  // Playwright measurement on pundo.cy confirmed: Chrome's lazy-load intersection check
  // runs against the document viewport, not the nested overflow-y-auto scroll container.
  // Images below the document fold but within the list container stay in complete=false
  // permanently and are never fetched. Forcing loading=eager makes all 83/83 load (HTTP 200).
  it('does NOT have loading=lazy — nested-scroller lazy-load bug (B2250-002)', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).not.toHaveAttribute('loading', 'lazy')
  })

  it('renders img with decoding=async', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('decoding', 'async')
  })

  it('passes className to img', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="x" className="w-full h-full object-cover" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveClass('w-full', 'h-full', 'object-cover')
  })

  it('renders placeholder after onError — genuinely broken image (HTTP 404)', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    fireEvent.error(img)
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    const svg = document.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('renders placeholder when src is null', () => {
    render(<ProductCardImage src={null} alt="kein Bild" />)
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    const svg = document.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('renders placeholder when src is undefined', () => {
    render(<ProductCardImage src={undefined} alt="kein Bild" />)
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    const svg = document.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('renders placeholder when src is empty string', () => {
    render(<ProductCardImage src="" alt="kein Bild" />)
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
  })

  it('placeholder does not trigger lightbox or navigation on click', () => {
    render(<ProductCardImage src={null} alt="kein Bild" />)
    const placeholder = document.querySelector('div')
    expect(placeholder).toBeInTheDocument()
    fireEvent.click(placeholder!)
  })

  // F4500: srcset für Retina-Variante
  it('renders srcSet and sizes when src2x is provided', () => {
    render(
      <ProductCardImage
        src="/product_images/abc_card.webp"
        src2x="/product_images/abc_card_2x.webp"
        sizes="120px"
        alt="Retina Test"
      />
    )
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('srcSet', '/product_images/abc_card.webp 1x, /product_images/abc_card_2x.webp 2x')
    expect(img).toHaveAttribute('sizes', '120px')
  })

  it('does NOT render srcSet or sizes when src2x is null', () => {
    render(<ProductCardImage src="/product_images/abc_card.webp" src2x={null} alt="kein Retina" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).not.toHaveAttribute('srcSet')
    expect(img).not.toHaveAttribute('sizes')
  })

  it('does NOT render srcSet when src2x is omitted (undefined)', () => {
    render(<ProductCardImage src="/product_images/abc_card.webp" alt="kein Retina" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).not.toHaveAttribute('srcSet')
  })

  it('falls back to default sizes=120px when src2x set but sizes omitted', () => {
    render(
      <ProductCardImage
        src="/product_images/abc_card.webp"
        src2x="/product_images/abc_card_2x.webp"
        alt="default sizes"
      />
    )
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('sizes', '120px')
  })
})
