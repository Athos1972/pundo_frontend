// =============================================================================
// src/config/brands/types.ts
//
// Brand-Config-Typen. Eigene Datei, damit individuelle Brand-Module den Typ
// importieren können, ohne den Barrel `./index` zu durchlaufen
// (sonst: Zirkular-Import index.ts ↔ pundo.ts/rusky.ts/naidivse.ts).
// =============================================================================

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
    homesickTeaser: boolean
    activityFeed: false | 'livefeed' | 'compact'   // F4700
    recentlyViewed: 'hidden' | 'home' | 'drawer'   // F4700
  }

  community?: {
    telegramName: string
    telegramUrl: string
    memberCount?: string
  }

  nav?: Array<{ key: string; href: string }>

  legal: {
    appName: string
    domain: string
  }
}
