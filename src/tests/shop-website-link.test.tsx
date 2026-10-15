import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ShopWebsiteLink } from '@/components/shop/ShopWebsiteLink'

describe('ShopWebsiteLink', () => {
  it('renders an https link with hostname (www stripped)', () => {
    const { container } = render(<ShopWebsiteLink url="https://www.example.com/shop?a=1" />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toBe('https://www.example.com/shop?a=1')
    expect(a.textContent).toContain('example.com')
    expect(a.getAttribute('rel')).toContain('noopener')
  })

  it('renders http links', () => {
    const { container } = render(<ShopWebsiteLink url="http://shop.cy" />)
    expect(container.querySelector('a')).not.toBeNull()
  })

  it.each([
    ['www.e-lavdas.com.cy', 'https://www.e-lavdas.com.cy'],
    ['GELATOFABIO.COM.CY', 'https://GELATOFABIO.COM.CY'],
    ['shop.cy/menu?x=1', 'https://shop.cy/menu?x=1'],
  ])('adds https:// to scheme-less %s (same rule as the backend)', (url, expected) => {
    const { container } = render(<ShopWebsiteLink url={url} />)
    expect(container.querySelector('a')?.getAttribute('href')).toBe(expected)
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'ftp://example.com',
    'not a url',
    '',
    null,
    undefined,
  ])('renders no link for %s', (url) => {
    const { container } = render(<ShopWebsiteLink url={url as string | null | undefined} />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.innerHTML).not.toMatch(/javascript:/i)
  })
})
