// Server Component wrapper — fetches initial votes, renders client inner.
// NOTE: tr (Translations) MUST NOT be passed Server→Client (contains functions).
// CommunityFeedbackClient calls t(lang) internally.
import { getShopVotes } from '@/lib/community-api'
import type { ShopVotesResponse } from '@/types/api'
import { CommunityFeedbackClient } from './CommunityFeedbackClient'

interface Props {
  shopId: number
  shopTypeCanonical: string | null | undefined
  isAuthenticated: boolean
  lang: string
}

export async function CommunityFeedbackSection({ shopId, shopTypeCanonical, isAuthenticated, lang }: Props) {
  let initialVotes: ShopVotesResponse = { shop_id: shopId, aggregates: [] }
  try {
    initialVotes = await getShopVotes(shopId, lang)
  } catch {
    // non-blocking: show empty section
  }

  return (
    <CommunityFeedbackClient
      shopId={shopId}
      shopTypeCanonical={shopTypeCanonical}
      initialAggregates={initialVotes.aggregates}
      isAuthenticated={isAuthenticated}
      lang={lang}
    />
  )
}
