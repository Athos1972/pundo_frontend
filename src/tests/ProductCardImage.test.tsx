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

  // B2250-002: loading="lazy" was removed because it caused ERR_ABORTED cascades
  // in the nested overflow-y-auto scroll container (burst-fires on scroll).
  // The img must NOT have loading="lazy" — eager loading (the default) is correct here.
  it('does NOT have loading=lazy (B2250-002: nested scroller burst-load fix)', () => {
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

  // BUG REGRESSION B2250-002: onError must show placeholder for genuinely broken images
  // (HTTP 404, missing card variant). It must NOT fire for ERR_ABORTED — but since we
  // removed loading="lazy", ERR_ABORTED cascades no longer occur in practice.
  it('renders placeholder after onError — genuinely broken image (bug regression)', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    fireEvent.error(img)
    // img must be gone, placeholder SVG must appear
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
})
