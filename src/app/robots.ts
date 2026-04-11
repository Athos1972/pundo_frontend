import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/shop-admin/', '/account/', '/auth/'],
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended'],
        allow: ['/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
