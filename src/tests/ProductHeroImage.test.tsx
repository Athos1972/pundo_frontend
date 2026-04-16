import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductHeroImage } from '@/components/product/ProductHeroImage'

describe('ProductHeroImage', () => {
  it('renders the image with correct src and alt', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    const img = screen.getAllByRole('img')[0]
    expect(img).toHaveAttribute('src', '/product_images/test.jpg')
    expect(img).toHaveAttribute('alt', 'Test Product')
  })

  it('does not show lightbox initially', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens lightbox on click', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes lightbox when clicking backdrop', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes lightbox when clicking X button', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes lightbox on Escape key', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lightbox falls back to src when origSrc is not provided', () => {
    render(<ProductHeroImage src="/product_images/test_detail.webp" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(2)
    expect(images[1]).toHaveAttribute('src', '/product_images/test_detail.webp')
  })

  it('lightbox uses origSrc when provided', () => {
    render(
      <ProductHeroImage
        src="/product_images/test_detail.webp"
        origSrc="/product_images/test_orig.jpg"
        alt="Test Product"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(2)
    // Hero shows detail variant
    expect(images[0]).toHaveAttribute('src', '/product_images/test_detail.webp')
    // Fullscreen dialog shows orig
    expect(images[1]).toHaveAttribute('src', '/product_images/test_orig.jpg')
  })

  it('clicking the lightbox image does not close the dialog', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.click(screen.getByRole('button', { name: 'Test Product' }))
    const images = screen.getAllByRole('img')
    fireEvent.click(images[1])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens lightbox on Enter key', () => {
    render(<ProductHeroImage src="/product_images/test.jpg" alt="Test Product" />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Test Product' }), { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
