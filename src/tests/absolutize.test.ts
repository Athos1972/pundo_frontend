import { describe, it, expect } from 'vitest'
import { absolutizeImageUrl } from '@/lib/seo/absolutize'

const SITE = 'https://pundo.cy'

describe('absolutizeImageUrl', () => {
  it('returns null for null input', () => {
    expect(absolutizeImageUrl(null, SITE)).toBeNull()
  })

  it('returns https URL unchanged', () => {
    const url = 'https://cdn.example.com/logo.png'
    expect(absolutizeImageUrl(url, SITE)).toBe(url)
  })

  it('prepends siteUrl to root-relative URL', () => {
    expect(absolutizeImageUrl('/shop_logos/42/logo_card.webp', SITE)).toBe(
      'https://pundo.cy/shop_logos/42/logo_card.webp',
    )
  })

  it('returns null for empty string', () => {
    expect(absolutizeImageUrl('', SITE)).toBeNull()
  })
})
