import type { BrandConfig } from './index'

export const naidivseConfig: BrandConfig = {
  slug: 'naidivse',
  name: 'Naidivse',
  domains: ['naidivse.com', 'www.naidivse.com'],

  assets: {
    logoSvg: '/brands/naidivse/logo-horizontal.svg',
    logoDarkSvg: '/brands/naidivse/logo-horizontal-dark.svg',
    logoPng: '/brands/naidivse/logo-horizontal.svg',
    favicon: '/brands/naidivse/favicon.svg',
    splashSvg: '/brands/naidivse/logo-icon.svg',
    ogImage: '/brands/naidivse/logo-horizontal.svg',
  },

  theme: {
    accent: '#1F4FA3',
    accentLight: '#E8EFF8',
    accentDark: '#163B7A',
    bg: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF1F8',
    border: '#D5DEF0',
    text: '#111827',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',
    success: '#2A8C5A',
    themeColor: '#1F4FA3',
  },

  fonts: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },

  pwa: {
    name: 'Naidivse — найди·всё',
    shortName: 'Naidivse',
  },

  meta: {
    title: 'Naidivse — найди·всё',
    description: 'The multilingual product & shop locator for Cyprus — coming soon.',
    siteUrl: 'https://naidivse.com',
    ogImage: '/brands/naidivse/logo-horizontal.svg',
    heroTitle: 'Finde alles. In der Nähe.',
    heroTagline: 'Zypern — in deiner Sprache.',
    heroText: 'Alle sind hier aus verschiedenen Gründen — und alle suchen verzweifelt nach dem Richtigen.',
  },

  analytics: {
    plausibleDomain: undefined,
    plausibleHost: 'https://plausible.pundo.cy',
  },

  features: {
    socialFeed: false,
    catsfirst: true,
    communityCard: true,
  },

  community: {
    telegramName: 'Русская Ларнака',
    telegramUrl: 'https://t.me/',
    memberCount: '1.240',
  },

  legal: {
    appName: 'Naidivse',
    domain: 'naidivse.com',
  },
}
