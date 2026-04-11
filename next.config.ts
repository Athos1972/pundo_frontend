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

const config: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [...new Set([...getLanIPs(), ...manualOrigins])],
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
    ]
  },
}

export default config
