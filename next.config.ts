import type { NextConfig } from 'next'
import os from 'os'

// Auto-detect all LAN IPv4 addresses so mobile/tablet devices on the local
// network can access the dev server without having to set ALLOWED_DEV_ORIGINS.
function getLanIPs(): string[] {
  const ips: string[] = []
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address)
    }
  }
  return ips
}

const manualOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : []

// Local brand testing: allow all brand domains mapped in /etc/hosts
const LOCAL_BRAND_DOMAINS = ['naidivse.com', 'naidivse.cy', 'rusky.app']

const config: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [...new Set([...getLanIPs(), ...manualOrigins, ...LOCAL_BRAND_DOMAINS])],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/api/v1/:path*`,
      },
      {
        source: '/brand_logos/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/brand_logos/:path*`,
      },
      {
        source: '/product_images/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/product_images/:path*`,
      },
      {
        source: '/review_photos/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/review_photos/:path*`,
      },
      {
        source: '/shop_logos/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/shop_logos/:path*`,
      },
    ]
  },
}

export default config
