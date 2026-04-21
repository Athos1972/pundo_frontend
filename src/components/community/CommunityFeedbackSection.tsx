// Server Component wrapper — fetches initial votes, renders client inner.
import { getShopVotes } from '@/lib/community-api'
import type { Translations } from '@/lib/translations'
import type { ShopVotesResponse } from '@/types/api'
import { CommunityFeedbackClient } from './CommunityFeedbackClient'

interface Props {
  shopId: number
  shopTypeCanonical: string | null | undefined
  isAuthenticated: boolean
  lang: string
  tr: Translations
}

export async function CommunityFeedbackSection({ shopId, shopTypeCanonical, isAuthenticated, lang, tr }: Props) {
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
      tr={tr}
    />
  )
}
