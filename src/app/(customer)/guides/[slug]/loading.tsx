export default function GuideDetailLoading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="h-4 w-24 bg-surface-alt rounded animate-pulse" />
      <div className="space-y-3">
        <div className="h-4 w-24 bg-surface-alt rounded-full animate-pulse" />
        <div className="h-8 w-3/4 bg-surface-alt rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-surface-alt rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-surface-alt rounded animate-pulse" style={{ width: `${80 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </main>
  )
}
