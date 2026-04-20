import type { BrandConfig } from './index'

// Placeholder — Assets und finale Theme-Werte werden ergänzt sobald
// Domain und Design für rusky-in-cyprus.de feststeht.
export const ruskyConfig: BrandConfig = {
  slug: 'rusky',
  name: 'Rusky in Cyprus',
  domains: ['rusky-in-cyprus.de', 'www.rusky-in-cyprus.de'],

  assets: {
    logoSvg: '/brands/rusky/logo.svg',
    logoPng: '/brands/rusky/logo.png',
    favicon: '/brands/rusky/favicon.jpg',
    splashSvg: '/brands/rusky/splash-outro.svg',
    ogImage: '/brands/rusky/logo.png',
  },

  theme: {
    accent: '#CC2200',
    accentLight: '#FFE5E0',
    accentDark: '#991A00',
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEEEE',
    border: '#DDDDDD',
    text: '#111111',
    textMuted: '#666666',
    textLight: '#999999',
    success: '#2A8C5A',
    themeColor: '#CC2200',
  },

  fonts: {
    heading: 'var(--font-space-grotesk)',
    body: 'var(--font-dm-sans)',
  },

  pwa: {
    name: 'Rusky in Cyprus',
    shortName: 'Rusky',
  },

  meta: {
    title: 'Rusky in Cyprus — Lokale Produkte finden',
    description: 'Find products and services near you in Cyprus',
    siteUrl: 'https://rusky-in-cyprus.de',
    ogImage: '/brands/rusky/logo.png',
    heroTitle: 'Найди всё рядом.',
    heroText: 'Все мы здесь по разным причинам — и все ищем своё.',
  },

  analytics: {
    plausibleDomain: undefined,
    plausibleHost: 'https://plausible.pundo.cy',
  },

  features: {
    socialFeed: true,
    catsfirst: false,
    communityCard: false,
  },

  legal: {
    appName: 'Rusky in Cyprus',
    domain: 'rusky-in-cyprus.de',
  },
}
