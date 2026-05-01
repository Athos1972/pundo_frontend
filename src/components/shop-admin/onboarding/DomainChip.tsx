'use client'

interface DomainChipProps {
  label: string
  selected: boolean
  onToggle: () => void
}

export function DomainChip({ label, selected, onToggle }: DomainChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'inline-flex items-center justify-center rounded-full border text-sm font-medium transition-colors',
        'min-h-[44px] px-4 py-2 text-start',
        selected
          ? 'bg-accent text-white border-accent'
          : 'bg-white text-gray-700 border-gray-300 hover:border-accent hover:text-accent',
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  )
}
