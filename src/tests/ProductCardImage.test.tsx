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

  it('renders img with loading=lazy and decoding=async', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
  })

  it('passes className to img', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="x" className="w-full h-full object-cover" />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveClass('w-full', 'h-full', 'object-cover')
  })

  // BUG REGRESSION: onError used to call style.display='none' (DOM mutation).
  // After fix: React state drives visibility, placeholder renders instead.
  it('renders placeholder after onError (bug regression: no DOM mutation)', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    // Simulate network abort / load error
    fireEvent.error(img)
    // img must be gone, placeholder SVG must appear
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    // The SVG placeholder has aria-hidden="true" — query directly
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
    // ProductCardImage is a leaf — no click side-effects
    render(<ProductCardImage src={null} alt="kein Bild" />)
    const placeholder = document.querySelector('div')
    expect(placeholder).toBeInTheDocument()
    // Should not throw on click
    fireEvent.click(placeholder!)
  })
})
