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

  it('shows initial fallback when url is null and no shopId', () => {
    render(<ShopLogoImage url={null} name="Franzi" size="lg" />)
    const fallback = screen.getByRole('img')
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveTextContent('F')
  })

  it('shows initial fallback after onError fires and no shopId', () => {
    render(<ShopLogoImage url="https://broken.example.com/logo.png" name="Test Shop" size="md" />)

    const img = screen.getByRole('img')
    expect(img.tagName).toBe('IMG')

    fireEvent.error(img)

    const fallback = screen.getByRole('img')
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveTextContent('T')
  })

  // Bug-Regression: Shop hat Favicon aber kein images[]-Eintrag — Detail-Header zeigte nur Buchstaben
  it('uses favicon API when url is null but shopId is provided', () => {
    render(<ShopLogoImage url={null} name="Mondy" size="lg" shopId={99} />)
    const img = screen.getByRole('img')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/api/v1/shops/99/favicon?size=large')
    expect(img).toHaveAttribute('alt', 'Mondy')
  })

  it('uses medium favicon size when size=md', () => {
    render(<ShopLogoImage url={null} name="Shop" size="md" shopId={7} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/api/v1/shops/7/favicon?size=medium')
  })

  it('falls back to letter initial after favicon also fails', () => {
    render(<ShopLogoImage url={null} name="Mondy" size="lg" shopId={99} />)

    const faviconImg = screen.getByRole('img')
    expect(faviconImg.tagName).toBe('IMG')

    fireEvent.error(faviconImg)

    const fallback = screen.getByRole('img')
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveTextContent('M')
  })

  it('tries favicon after logo URL fails when shopId is provided', () => {
    render(<ShopLogoImage url="https://broken.example.com/logo.png" name="Brokenco" size="lg" shopId={5} />)

    const logoImg = screen.getByRole('img')
    expect(logoImg).toHaveAttribute('src', 'https://broken.example.com/logo.png')

    fireEvent.error(logoImg)

    const faviconImg = screen.getByRole('img')
    expect(faviconImg.tagName).toBe('IMG')
    expect(faviconImg).toHaveAttribute('src', '/api/v1/shops/5/favicon?size=large')
  })
})
