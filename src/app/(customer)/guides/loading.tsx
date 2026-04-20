export default function GuidesLoading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-surface-alt rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-surface-alt rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 bg-surface-alt rounded-full animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 bg-surface-alt rounded-2xl animate-pulse" />
        ))}
      </div>
    </main>
  )
}
