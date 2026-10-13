import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

const DISALLOW = ['/api/', '/admin/', '/shop-admin/', '/account/', '/auth/']

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended'],
        allow: ['/'],
        disallow: DISALLOW,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
