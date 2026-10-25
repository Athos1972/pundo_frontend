// F8960 — Admin help topics (data only, no UI text). Texts live in system-admin-help-content.ts.
// Server-side only: SOP content and video IDs must never be shipped to a client bundle (see guard test).

export const HELP_TOPIC_IDS = ['admin-tour', 'claims-owners', 'shops', 'catalog-basics', 'products', 'translations', 'crm', 'crm-persons', 'moderation', 'catalog-quality', 'api-keys'] as const
export type HelpTopicId = (typeof HELP_TOPIC_IDS)[number]

export interface HelpAdminLink {
  /** Static admin route: no dynamic segments, no query. */
  href: `/admin/${string}`
  navKey:
    | 'nav_dashboard' | 'nav_claims' | 'nav_shop_owners' | 'nav_shops' | 'nav_shop_types'
    | 'nav_products' | 'nav_brands' | 'nav_categories' | 'nav_crm' | 'help_link_crm_settings' | 'crm_persons_title' | 'crm_review_title'
    | 'nav_reviews' | 'nav_social_link_rules' | 'nav_cat_attr_defs' | 'nav_item_domain_mappings' | 'nav_api_keys'
}

export interface HelpTopic {
  id: HelpTopicId
  /** Display number: '1', '2', '3', '3b', '4', '4b', '5', '6', '7', '8'. */
  number: string
  /** Unique, ascending = display order. */
  order: number
  /** At least one; the first one is the primary admin page of the topic. */
  adminLinks: readonly [HelpAdminLink, ...HelpAdminLink[]]
  /** YouTube video ID (11 chars). Set only after the upload; empty = "Video coming soon". */
  videoId?: string
  durationSec?: number
  /** Written guide only, by decision (no video planned): no video badge, no "Video coming soon" hint. */
  noVideo?: boolean
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
    id: 'catalog-basics', number: '3b', order: 4,
    videoId: 'A1XM83OTa88', durationSec: 158,
    adminLinks: [
      { href: '/admin/categories', navKey: 'nav_categories' },
      { href: '/admin/brands', navKey: 'nav_brands' },
    ],
  },
  {
    id: 'products', number: '4', order: 5,
    videoId: 'iAZbwukJxtY', durationSec: 148,
    adminLinks: [
      { href: '/admin/products', navKey: 'nav_products' },
      { href: '/admin/brands', navKey: 'nav_brands' },
      { href: '/admin/categories', navKey: 'nav_categories' },
    ],
  },
  {
    id: 'translations', number: '4b', order: 6,
    videoId: 'sw0l_oaN73M', durationSec: 181,
    adminLinks: [
      { href: '/admin/categories', navKey: 'nav_categories' },
      { href: '/admin/products', navKey: 'nav_products' },
    ],
  },
  {
    id: 'crm', number: '5', order: 7,
    videoId: '0gdPz5DOLsk', durationSec: 226,
    adminLinks: [
      { href: '/admin/crm/orgs', navKey: 'nav_crm' },
      { href: '/admin/crm/persons', navKey: 'crm_persons_title' },
      { href: '/admin/crm/review', navKey: 'crm_review_title' },
      { href: '/admin/crm/settings', navKey: 'help_link_crm_settings' },
    ],
  },
  {
    id: 'crm-persons', number: '5b', order: 8,
    adminLinks: [
      { href: '/admin/crm/persons', navKey: 'crm_persons_title' },
      { href: '/admin/crm/orgs', navKey: 'nav_crm' },
      { href: '/admin/crm/review', navKey: 'crm_review_title' },
    ],
  },
  {
    id: 'moderation', number: '6', order: 9,
    videoId: 'AUA2FiK-F8Y', durationSec: 164,
    adminLinks: [
      { href: '/admin/reviews', navKey: 'nav_reviews' },
      { href: '/admin/social-link-rules', navKey: 'nav_social_link_rules' },
    ],
  },
  {
    id: 'catalog-quality', number: '7', order: 10,
    videoId: 'nQWqQ1xgvVI', durationSec: 173,
    adminLinks: [
      { href: '/admin/category-attribute-definitions', navKey: 'nav_cat_attr_defs' },
      { href: '/admin/item-domain-mappings', navKey: 'nav_item_domain_mappings' },
    ],
  },
  {
    id: 'api-keys', number: '8', order: 11, noVideo: true,
    adminLinks: [{ href: '/admin/api-keys', navKey: 'nav_api_keys' }],
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
