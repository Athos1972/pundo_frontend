'use client'

import type { OnboardingProviderType } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface StepProviderTypeProps {
  tr: ShopAdminTranslations
  selected: OnboardingProviderType | null
  onSelect: (type: OnboardingProviderType) => void
  onNext: () => void
}

const TYPES: { type: OnboardingProviderType; icon: string }[] = [
  { type: 'handwerker', icon: '🔧' },
  { type: 'dienstleister', icon: '✂️' },
  { type: 'haendler', icon: '🛒' },
  { type: 'gastro', icon: '🍽️' },
]

function labelFor(type: OnboardingProviderType, tr: ShopAdminTranslations): string {
  switch (type) {
    case 'handwerker': return tr.onboarding_type_handwerker
    case 'dienstleister': return tr.onboarding_type_dienstleister
    case 'haendler': return tr.onboarding_type_haendler
    case 'gastro': return tr.onboarding_type_gastro
  }
}

export function StepProviderType({ tr, selected, onSelect, onNext }: StepProviderTypeProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step1_title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ type, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 min-h-[110px] transition-colors',
              selected === type
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-gray-200 bg-white text-gray-700 hover:border-accent/50',
            ].join(' ')}
            aria-pressed={selected === type}
          >
            <span className="text-3xl">{icon}</span>
            <span className="text-sm font-semibold text-center leading-tight">{labelFor(type, tr)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!selected}
        className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {tr.onboarding_next}
      </button>
    </div>
  )
}
