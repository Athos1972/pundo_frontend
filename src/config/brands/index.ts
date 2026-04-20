// =============================================================================
// src/config/brands/index.ts
//
// Brand-Config-System. Läuft in Edge Runtime (proxy.ts) UND Node.js Runtime
// (Server Components) — KEINE Node.js-spezifischen Imports erlaubt.
// =============================================================================

import { pundoConfig } from './pundo'
import { ruskyConfig } from './rusky'
import { naidivseConfig } from './naidivse'

export interface BrandConfig {
  slug: string
  name: string
  domains: string[]

  assets: {
    logoSvg: string
    logoDarkSvg?: string
    logoPng: string
    favicon: string
    splashSvg: string
    ogImage: string
  }

  theme: {
    accent: string
    accentLight: string
    accentDark: string
    bg: string
    surface: string
    surfaceAlt: string
    border: string
    text: string
    textMuted: string
    textLight: string
    success: string
    themeColor: string
  }

  fonts: {
    // CSS-Variablen-Referenzen, z.B. 'var(--font-space-grotesk)'
    heading: string
    body: string
  }

  pwa: {
    name: string
    shortName: string
  }

  meta: {
    title: string
    description: string
    siteUrl: string
    ogImage: string
    heroTitle: string
    heroText: string
    heroTagline?: string
  }

  analytics: {
    plausibleDomain?: string
    plausibleHost: string
  }

  features: {
    socialFeed: boolean
    catsfirst: boolean
    communityCard: boolean
  }

  community?: {
    telegramName: string
    telegramUrl: string
    memberCount?: string
  }

  legal: {
    appName: string
    domain: string
  }
}

const ALL_BRANDS: BrandConfig[] = [pundoConfig, ruskyConfig, naidivseConfig]

// Domain → Brand-Slug Lookup (O(1) nach Aufbau)
const DOMAIN_MAP: Map<string, BrandConfig> = new Map()
for (const brand of ALL_BRANDS) {
  for (const domain of brand.domains) {
    DOMAIN_MAP.set(domain.toLowerCase(), brand)
  }
  // Auch per Slug direkt abrufbar
  DOMAIN_MAP.set(brand.slug, brand)
}

export function getBrandConfig(hostOrSlug: string): BrandConfig {
  const key = hostOrSlug.toLowerCase().replace(/^www\./, '')
  return DOMAIN_MAP.get(key) ?? DOMAIN_MAP.get(hostOrSlug.toLowerCase()) ?? pundoConfig
}

// Server-only: liest x-brand-slug aus Next.js Request-Headers
export async function getBrandFromHeaders(): Promise<BrandConfig> {
  const { headers } = await import('next/headers')
  const headerStore = await headers()
  const slug = headerStore.get('x-brand-slug') ?? 'pundo'
  return getBrandConfig(slug)
}

export function buildThemeCss(brand: BrandConfig): string {
  const { theme, fonts } = brand
  return [
    ':root{',
    `--color-accent:${theme.accent};`,
    `--color-accent-light:${theme.accentLight};`,
    `--color-accent-dark:${theme.accentDark};`,
    `--color-bg:${theme.bg};`,
    `--color-surface:${theme.surface};`,
    `--color-surface-alt:${theme.surfaceAlt};`,
    `--color-border:${theme.border};`,
    `--color-text:${theme.text};`,
    `--color-text-muted:${theme.textMuted};`,
    `--color-text-light:${theme.textLight};`,
    `--color-success:${theme.success};`,
    `--brand-font-heading:${fonts.heading};`,
    `--brand-font-body:${fonts.body};`,
    '}',
  ].join('')
}
