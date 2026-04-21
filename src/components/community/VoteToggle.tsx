'use client'

interface Props {
  label: string
  value: boolean | null  // null = no vote
  count: number
  onChange: (v: boolean) => void
  disabled?: boolean
}

// Boolean toggle for attributes like parking, delivery, terrace
export function VoteToggle({ label, value, count, onChange, disabled }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text">{label}</span>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <span className="text-xs text-text-muted">{count}</span>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value === true}
            onClick={() => onChange(value === true ? false : true)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              value === true
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-surface text-text-muted border-border hover:border-green-400',
            ].join(' ')}
          >
            ✓
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value === false}
            onClick={() => onChange(value === false ? true : false)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              value === false
                ? 'bg-red-400 text-white border-red-400'
                : 'bg-surface text-text-muted border-border hover:border-red-300',
            ].join(' ')}
          >
            ✗
          </button>
        </div>
      </div>
    </div>
  )
}
