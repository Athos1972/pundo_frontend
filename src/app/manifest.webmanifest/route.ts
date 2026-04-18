import { getBrandConfig } from '@/config/brands'

export async function GET(request: Request) {
  const host = request.headers.get('host') ?? ''
  const brand = getBrandConfig(host)

  const manifest = {
    name: brand.pwa.name,
    short_name: brand.pwa.shortName,
    description: brand.meta.description,
    start_url: '/',
    display: 'standalone',
    background_color: brand.theme.bg,
    theme_color: brand.theme.themeColor,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }

  return Response.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/manifest+json',
    },
  })
}
