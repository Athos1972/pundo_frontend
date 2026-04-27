'use client'

interface FABOnboardingPopoutProps {
  text: string
  visible: boolean
  onDismiss: () => void
  dismissLabel: string
  pulse?: boolean
}

export function FABOnboardingPopout({
  text,
  visible,
  onDismiss,
  dismissLabel,
  pulse: _pulse,
}: FABOnboardingPopoutProps) {
  if (!visible) return null

  return (
    // Positioned absolute relative to the FAB container
    // bottom-full = above the FAB, end-0 = aligned to button end edge (RTL-aware)
    <div
      className="absolute bottom-full mb-3 end-0 z-[45] w-[220px]"
      role="tooltip"
    >
      <div className="bg-surface rounded-xl shadow-md p-3 text-sm text-text border border-border relative">
        <p className="pe-6 leading-snug">{text}</p>
        <button
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute top-2 end-2 text-text-muted hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        {/* Speech bubble arrow — points down toward the FAB */}
        <div className="absolute -bottom-[7px] end-6 w-3 h-3 bg-surface border-b border-e border-border rotate-45" />
      </div>
    </div>
  )
}
