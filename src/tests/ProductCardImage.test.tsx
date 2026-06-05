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

  // BUG REGRESSION B2250-002: fast-scroll causes net::ERR_ABORTED which fires the error
  // event on intact images. The old fix set permanent failed=true — leaving cards blank.
  // New fix: retry up to MAX_RETRIES=2 times; only then show permanent placeholder.
  it('retries after first error — img still present, no placeholder yet', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img = screen.getByRole('img', { hidden: true })
    // Simulate first abort (e.g. net::ERR_ABORTED during fast scroll)
    fireEvent.error(img)
    // After one error: img element should still be in the DOM (retry state)
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    // No placeholder SVG yet
    expect(document.querySelector('svg[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('shows placeholder permanently after MAX_RETRIES (2) errors', () => {
    render(<ProductCardImage src="/product_images/test.jpg" alt="Test Produkt" />)
    const img1 = screen.getByRole('img', { hidden: true })
    fireEvent.error(img1)
    // After 1st error: retry — img still present
    const img2 = screen.getByRole('img', { hidden: true })
    fireEvent.error(img2)
    // After 2nd error: MAX_RETRIES reached — placeholder must appear
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
    // ProductCardImage is a leaf — no click side-effects
    render(<ProductCardImage src={null} alt="kein Bild" />)
    const placeholder = document.querySelector('div')
    expect(placeholder).toBeInTheDocument()
    // Should not throw on click
    fireEvent.click(placeholder!)
  })
})
