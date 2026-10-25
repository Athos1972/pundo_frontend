// ─── CRM display labels (F7600, org cut) ──────────────────────────────────────────────────────────────────────────────
// Pure helpers (Server and Client Components): backend codes → translated text. Unknown codes are shown raw instead of
// being hidden, so a new backend value stays visible.

import type { CrmChannelOwnerType, CrmLegalTier, CrmReviewCategory } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const KIND_KEYS: Record<string, keyof SysAdminTranslations> = {
  email: 'crm_channel_kind_email',
  phone_call: 'crm_channel_kind_phone',
  phone: 'crm_channel_kind_phone',
  whatsapp: 'crm_doc_channel_whatsapp',
  sms: 'crm_doc_channel_sms',
  telegram: 'crm_doc_channel_telegram',
}

export function channelKindLabel(tr: SysAdminTranslations, kind: string): string {
  const key = KIND_KEYS[kind]
  return key ? String(tr[key]) : kind
}

export const LEGAL_TIERS: readonly CrmLegalTier[] = ['green', 'amber', 'red']

export function tierLabel(tr: SysAdminTranslations, tier: string): string {
  const value = tr[`crm_tier_${tier}` as keyof SysAdminTranslations]
  return typeof value === 'string' ? value : tier
}

export const TIER_BADGE: Record<CrmLegalTier, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-100 text-red-800',
}

export function ownerLabel(tr: SysAdminTranslations, type: CrmChannelOwnerType): string {
  return type === 'org' ? tr.crm_owner_org : type === 'relation' ? tr.crm_owner_relation : tr.crm_owner_person
}

export const REVIEW_CATEGORIES: readonly CrmReviewCategory[] = ['legacy', 'channel_owner', 'relations_without_role', 'persons_name_parts']

export function reviewCategoryLabel(tr: SysAdminTranslations, category: CrmReviewCategory): string {
  return tr[`crm_review_cat_${category}` as const]
}

export function reviewKindLabel(tr: SysAdminTranslations, kind: string): string {
  const value = tr[`crm_review_kind_${kind}` as keyof SysAdminTranslations]
  return typeof value === 'string' ? value : kind
}
