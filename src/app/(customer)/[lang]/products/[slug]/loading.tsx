export default function ProductLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex gap-4">
        <div className="w-24 h-24 bg-surface-alt rounded-xl animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-surface-alt rounded animate-pulse" />
          <div className="h-4 w-32 bg-surface-alt rounded animate-pulse" />
        </div>
      </div>
      <div className="h-32 bg-surface-alt rounded-xl animate-pulse" />
      <div className="h-48 bg-surface-alt rounded-xl animate-pulse" />
    </div>
  )
}
