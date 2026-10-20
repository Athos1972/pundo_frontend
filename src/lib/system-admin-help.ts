// F8960 — Admin help topics (data only, no UI text). Texts live in system-admin-help-content.ts.
// Server-side only: SOP content and video IDs must never be shipped to a client bundle (see guard test).

export const HELP_TOPIC_IDS = ['admin-tour', 'claims-owners', 'shops', 'products', 'translations', 'crm'] as const
export type HelpTopicId = (typeof HELP_TOPIC_IDS)[number]

export interface HelpAdminLink {
  /** Static admin route: no dynamic segments, no query. */
  href: `/admin/${string}`
  navKey:
    | 'nav_dashboard' | 'nav_claims' | 'nav_shop_owners' | 'nav_shops' | 'nav_shop_types'
    | 'nav_products' | 'nav_brands' | 'nav_categories' | 'nav_crm' | 'help_link_crm_settings'
}

export interface HelpTopic {
  id: HelpTopicId
  /** Display number: '1', '2', '3', '4', '4b', '5'. */
  number: string
  /** Unique, ascending = display order. */
  order: number
  /** At least one; the first one is the primary admin page of the topic. */
  adminLinks: readonly [HelpAdminLink, ...HelpAdminLink[]]
  /** YouTube video ID (11 chars). Set only after the upload; empty = "Video coming soon". */
  videoId?: string
  durationSec?: number
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'admin-tour', number: '1', order: 1,
    videoId: 'fAgsmmvzEIQ', durationSec: 164,
    adminLinks: [{ href: '/admin/dashboard', navKey: 'nav_dashboard' }],
  },
  {
    id: 'claims-owners', number: '2', order: 2,
    videoId: 'S2bt0GO6zKQ', durationSec: 183,
    adminLinks: [
      { href: '/admin/claims', navKey: 'nav_claims' },
      { href: '/admin/shop-owners', navKey: 'nav_shop_owners' },
    ],
  },
  {
    id: 'shops', number: '3', order: 3,
    videoId: 'xYCinlqnnIk', durationSec: 189,
    adminLinks: [
      { href: '/admin/shops', navKey: 'nav_shops' },
      { href: '/admin/shop-types', navKey: 'nav_shop_types' },
    ],
  },
  {
    id: 'products', number: '4', order: 4,
    videoId: 'ZbOaYgYydRE', durationSec: 214,
    adminLinks: [
      { href: '/admin/products', navKey: 'nav_products' },
      { href: '/admin/brands', navKey: 'nav_brands' },
      { href: '/admin/categories', navKey: 'nav_categories' },
    ],
  },
  {
    id: 'translations', number: '4b', order: 5,
    videoId: 'd9sKexlCOyo', durationSec: 226,
    adminLinks: [
      { href: '/admin/categories', navKey: 'nav_categories' },
      { href: '/admin/products', navKey: 'nav_products' },
    ],
  },
  {
    id: 'crm', number: '5', order: 6,
    videoId: '0gdPz5DOLsk', durationSec: 226,
    adminLinks: [
      { href: '/admin/crm/contacts', navKey: 'nav_crm' },
      { href: '/admin/crm/settings', navKey: 'help_link_crm_settings' },
    ],
  },
]

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export function isValidVideoId(id: string): boolean {
  return VIDEO_ID_RE.test(id)
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

/** 185 -> "3:05" */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id)
}
