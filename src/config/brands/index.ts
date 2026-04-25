// =============================================================================
// src/config/brands/index.ts
//
// Brand-Config-System. Läuft in Edge Runtime (proxy.ts) UND Node.js Runtime
// (Server Components) — KEINE Node.js-spezifischen Imports erlaubt.
// =============================================================================

import { pundoConfig } from './pundo'
import { ruskyConfig } from './rusky'
import { naidivseConfig } from './naidivse'
import type { BrandConfig } from './types'

export type { BrandConfig } from './types'

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
  // Strip port from host header (e.g., "naidivse.com:3000" → "naidivse.com")
  const hostWithoutPort = hostOrSlug.split(':')[0]
  const key = hostWithoutPort.toLowerCase().replace(/^www\./, '')
  return DOMAIN_MAP.get(key) ?? DOMAIN_MAP.get(hostWithoutPort.toLowerCase()) ?? pundoConfig
}

// Server-only: liest x-brand-slug aus Next.js Request-Headers
export async function getBrandFromHeaders(): Promise<BrandConfig> {
  const { headers } = await import('next/headers')
  const headerStore = await headers()
  const slug = headerStore.get('x-brand-slug') ?? 'pundo'
  return getBrandConfig(slug)
}

// Maps CSS variable references (e.g. 'var(--font-space-grotesk)') to the actual
// font-family strings that next/font/google injects on <body>. Required because
// next/font variables are body-scoped and cannot be referenced via var() on :root.
const FONT_VAR_MAP: Record<string, string> = {
  'var(--font-space-grotesk)': '"Space Grotesk", "Space Grotesk Fallback"',
  'var(--font-dm-sans)': '"DM Sans", "DM Sans Fallback"',
  'var(--font-unbounded)': '"Unbounded", "Unbounded Fallback"',
  'var(--font-golos-text)': '"Golos Text", "Golos Text Fallback"',
}

export function buildThemeCss(brand: BrandConfig): string {
  const { theme, fonts } = brand
  // @csstools/postcss-cascade-layers polyfill rewrites unlayered :root rules with
  // specificity 5-1-0. Using 8× :not(#\#) gives 8-1-0 to reliably override at runtime.
  const resolvedHeadingFont = FONT_VAR_MAP[fonts.heading] ?? fonts.heading
  const resolvedBodyFont = FONT_VAR_MAP[fonts.body] ?? fonts.body

  return [
    ':root:not(#\\#):not(#\\#):not(#\\#):not(#\\#):not(#\\#):not(#\\#):not(#\\#):not(#\\#){',
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
    `--brand-font-heading:${resolvedHeadingFont};`,
    `--brand-font-body:${resolvedBodyFont};`,
    '}',
  ].join('')
}
