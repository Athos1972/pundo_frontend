import type { BrandConfig } from './types'

export const pundoConfig: BrandConfig = {
  slug: 'pundo',
  name: 'Pundo',
  domains: ['pundo.cy', 'www.pundo.cy'],

  assets: {
    logoSvg: '/brands/pundo/logo.svg',
    logoPng: '/brands/pundo/logo.png',
    favicon: '/brands/pundo/favicon.jpg',
    splashSvg: '/brands/pundo/splash-outro.svg',
    ogImage: '/brands/pundo/logo.png',
  },

  theme: {
    accent: '#D4622A',
    accentLight: '#FAE8DF',
    accentDark: '#A04515',
    bg: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EDE8',
    border: '#E5E0D9',
    text: '#1A1714',
    textMuted: '#7A736B',
    textLight: '#B0A89F',
    success: '#2A8C5A',
    themeColor: '#D4622A',
  },

  fonts: {
    heading: 'var(--font-space-grotesk)',
    body: 'var(--font-dm-sans)',
  },

  pwa: {
    name: 'Pundo — Lokale Produkte finden',
    shortName: 'Pundo',
  },

  meta: {
    title: 'Pundo — Lokale Produkte finden',
    description: 'Finde Produkte in Shops in deiner Nähe in Larnaca, Zypern',
    siteUrl: 'https://pundo.cy',
    ogImage: '/brands/pundo/logo.png',
    heroTitle: 'Finde lokale Shops & Produkte',
    heroText: 'Wir sind alle aus unterschiedlichen Gründen auf dieser Insel — und alle genervt, weil wir uns nicht zurechtfinden.',
  },

  analytics: {
    plausibleDomain: 'pundo.cy',
    plausibleHost: 'https://plausible.pundo.cy',
  },

  features: {
    socialFeed: false,
    catsfirst: false,
    communityCard: false,
    homesickTeaser: false,
  },

  nav: [
    { key: 'nav_shops', href: '/shops' },
    { key: 'nav_guides', href: '/guides' },
    { key: 'nav_for_shops', href: '/for-shops' },
  ],

  legal: {
    appName: 'Pundo',
    domain: 'pundo.cy',
  },
}
