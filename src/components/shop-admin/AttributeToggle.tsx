// src/components/shop-admin/AttributeToggle.tsx — F5300 / F3800 Phase 1a
// Generic toggle/switch for self-service boolean attributes.
// Clean Boundary: only imports from @/components/ui/ allowed.

'use client'

interface AttributeToggleProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function AttributeToggle({ id, label, hint, checked, onChange }: AttributeToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/40
          ${checked ? 'bg-accent' : 'bg-gray-200'}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <div className="flex flex-col gap-0.5 min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-gray-700 cursor-pointer">
          {label}
        </label>
        {hint && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    </div>
  )
}
