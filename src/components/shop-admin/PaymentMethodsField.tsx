// src/components/shop-admin/PaymentMethodsField.tsx — F5300 Payment-Methods multiselect
// Clean Boundary: only imports from @/components/ui/ and shared @/lib/payment-methods.
// Labels are resolved by the caller via the tAdmin namespace.

'use client'

import { PAYMENT_METHODS } from '@/lib/payment-methods'
import type { PaymentMethodValue } from '@/types/shop-admin'

interface PaymentMethodsFieldProps {
  label: string
  value: PaymentMethodValue[]
  onChange: (value: PaymentMethodValue[]) => void
  /** Function that maps a labelKey to the localised string, e.g. tAdmin(lang)[key] */
  getLabel: (key: string) => string
}

export function PaymentMethodsField({ label, value, onChange, getLabel }: PaymentMethodsFieldProps) {
  function toggle(method: PaymentMethodValue) {
    if (value.includes(method)) {
      onChange(value.filter(m => m !== method))
    } else {
      onChange([...value, method])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2 rtl:flex-row-reverse">
        {PAYMENT_METHODS.map(({ value: methodValue, labelKey, Icon }) => {
          const isSelected = value.includes(methodValue)
          return (
            <button
              key={methodValue}
              type="button"
              onClick={() => toggle(methodValue)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors
                ${isSelected
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-accent'
                }`}
            >
              <Icon className="w-4 h-4" />
              {getLabel(labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
