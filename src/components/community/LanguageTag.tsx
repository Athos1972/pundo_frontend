// Small pill badge: "DE 4.2★" for shop list and shop header
// ⚠️ ShopListItem currently has no language votes — usage in list view
// requires backend to add community_language_labels to ShopListItem response.

interface Props {
  languageCode: string   // 'de', 'en', etc.
  avgScore: number       // weighted_avg from aggregates
  voteCount: number
}

export function LanguageTag({ languageCode, avgScore, voteCount }: Props) {
  if (voteCount === 0) return null

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800"
      title={`${voteCount} vote${voteCount === 1 ? '' : 's'}`}
    >
      {languageCode.toUpperCase()}
      <span className="text-amber-500">★</span>
      {avgScore.toFixed(1)}
    </span>
  )
}
