import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShopLogoImage } from '@/components/shop/ShopLogoImage'

// Mock next/image as a plain <img> element
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, onError, width, height, className } = props
    return (
      <img
        src={String(src)}
        alt={String(alt ?? '')}
        width={width as number}
        height={height as number}
        className={className as string}
        onError={onError as React.ReactEventHandler<HTMLImageElement>}
      />
    )
  },
}))

describe('ShopLogoImage', () => {
  it('renders <img> when a valid URL is provided', () => {
    render(<ShopLogoImage url="/shop_logos/42/logo_card.webp" name="My Shop" size="lg" />)
    const img = screen.getByRole('img')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/shop_logos/42/logo_card.webp')
    expect(img).toHaveAttribute('alt', 'My Shop')
  })

  it('shows initial fallback when url is null', () => {
    render(<ShopLogoImage url={null} name="Franzi" size="lg" />)
    // The fallback div has role="img"
    const fallback = screen.getByRole('img')
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveTextContent('F')
  })

  it('shows initial fallback after onError fires', () => {
    render(<ShopLogoImage url="https://broken.example.com/logo.png" name="Test Shop" size="md" />)

    // Initially the <img> element should be rendered
    const img = screen.getByRole('img')
    expect(img.tagName).toBe('IMG')

    // Simulate load error
    fireEvent.error(img)

    // After error, the fallback div with initial should be shown
    const fallback = screen.getByRole('img')
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveTextContent('T')
  })
})
