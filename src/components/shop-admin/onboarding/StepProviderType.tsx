'use client'

import { useState, useRef } from 'react'
import type { OnboardingProviderType } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface StepProviderTypeProps {
  tr: ShopAdminTranslations
  selected: OnboardingProviderType | null
  /** Called after 150 ms visual-feedback delay — triggers wizard advance */
  onAutoSelect: (type: OnboardingProviderType) => void
}

const TYPES: { type: OnboardingProviderType; icon: string }[] = [
  { type: 'handwerker',    icon: '🔧' },
  { type: 'dienstleister', icon: '✂️' },
  { type: 'haendler',      icon: '🛒' },
  { type: 'gastro',        icon: '🍽️' },
]

function labelFor(type: OnboardingProviderType, tr: ShopAdminTranslations): string {
  switch (type) {
    case 'handwerker':    return tr.onboarding_type_handwerker
    case 'dienstleister': return tr.onboarding_type_dienstleister
    case 'haendler':      return tr.onboarding_type_haendler
    case 'gastro':        return tr.onboarding_type_gastro
  }
}

export function StepProviderType({ tr, selected, onAutoSelect }: StepProviderTypeProps) {
  // Local state for instant visual feedback before the parent advances the step
  const [pending, setPending] = useState<OnboardingProviderType | null>(selected)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTileClick(type: OnboardingProviderType) {
    // Cancel any in-flight advance (double-tap guard)
    if (timerRef.current) clearTimeout(timerRef.current)
    setPending(type)
    timerRef.current = setTimeout(() => onAutoSelect(type), 150)
  }

  const shown = pending ?? selected

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step1_title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ type, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleTileClick(type)}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 min-h-[110px] transition-all duration-150',
              shown === type
                ? 'border-accent bg-accent/10 text-accent scale-[1.03]'
                : 'border-gray-200 bg-white text-gray-700 hover:border-accent/50',
            ].join(' ')}
            aria-pressed={shown === type}
          >
            <span className="text-3xl">{icon}</span>
            <span className="text-sm font-semibold text-center leading-tight">{labelFor(type, tr)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
