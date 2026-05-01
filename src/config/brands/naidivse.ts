import type { BrandConfig } from './types'

export const naidivseConfig: BrandConfig = {
  slug: 'naidivse',
  name: 'Naidivse',
  domains: ['naidivse.cy', 'www.naidivse.cy', 'naidivse.com', 'www.naidivse.com'],

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
    heading: 'var(--font-unbounded)',
    body: 'var(--font-golos-text)',
  },

  pwa: {
    name: 'Naidivse — найди·всё',
    shortName: 'Naidivse',
  },

  meta: {
    title: 'Naidivse — найди·всё',
    description: 'Finde alles. In der Nähe. Zypern — in deiner Sprache.',
    siteUrl: 'https://naidivse.cy',
    ogImage: '/brands/naidivse/logo-horizontal.svg',
    heroTitle: 'Finde alles. In der Nähe.',
    heroTagline: 'Zypern — in deiner Sprache.',
    heroText: 'Alle sind hier aus verschiedenen Gründen — und alle suchen verzweifelt nach dem Richtigen.',
  },

  analytics: {
    plausibleDomain: 'naidivse.cy',
    plausibleHost: 'https://plausible.pundo.cy',
    plausibleScriptSrc: 'https://plausible.pundo.cy/js/pa-8BR5fJSOFpwDfUZaiRcWi.js',
  },

  features: {
    socialFeed: false,
    catsfirst: true,
    communityCard: true,
    homesickTeaser: true,
    activityFeed: 'livefeed',
    recentlyViewed: 'home',
  },

  community: {
    telegramName: 'Русская Ларнака',
    telegramUrl: 'https://t.me/',
    memberCount: '1.240',
  },

  nav: [
    { key: 'nav_shops', href: '/shops' },
    { key: 'nav_guides', href: '/guides' },
    { key: 'nav_community', href: '/community' },
    { key: 'nav_homesick', href: '/nostalgia' },
  ],

  legal: {
    appName: 'Naidivse',
    domain: 'naidivse.cy',
  },
}
