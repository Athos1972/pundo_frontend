import { Suspense } from 'react'
import SearchContent from './SearchContent'

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
