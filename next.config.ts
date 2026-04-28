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

// Playwright E2E tests connect via 127.0.0.1 — allow HMR WebSocket from loopback
const LOOPBACK_ORIGINS = ['127.0.0.1', 'localhost']

// T3 — Security headers as Defense-in-Depth backup (proxy.ts is the primary source).
// HSTS is also included here so it is set when Next.js is fronted directly (e.g. in
// standalone mode without Caddy). Browsers ignore HSTS on plain HTTP so including it
// in dev is harmless. No `preload` until subdomain inventory is confirmed (Phase 3).
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
]

const config: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [...new Set([...getLanIPs(), ...manualOrigins, ...LOCAL_BRAND_DOMAINS, ...LOOPBACK_ORIGINS])],
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
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
