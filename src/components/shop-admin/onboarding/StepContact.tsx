'use client'

import { useState } from 'react'
import type { OnboardingContact } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface StepContactProps {
  tr: ShopAdminTranslations
  initialContact: OnboardingContact
  onNext: (contact: OnboardingContact) => void
  onBack: () => void
}

type ContactField = keyof OnboardingContact

const FIELDS: { key: ContactField; icon: string; inputType: string; label: (tr: ShopAdminTranslations) => string }[] = [
  { key: 'whatsapp', icon: '💬', inputType: 'tel', label: tr => tr.onboarding_contact_whatsapp },
  { key: 'phone', icon: '📞', inputType: 'tel', label: tr => tr.onboarding_contact_phone },
  { key: 'businessEmail', icon: '✉️', inputType: 'email', label: tr => tr.onboarding_contact_email },
  { key: 'instagram', icon: '📷', inputType: 'url', label: tr => tr.onboarding_contact_instagram },
  { key: 'telegram', icon: '✈️', inputType: 'text', label: tr => tr.onboarding_contact_telegram },
  { key: 'facebook', icon: '👥', inputType: 'url', label: tr => tr.onboarding_contact_facebook },
  { key: 'website', icon: '🌐', inputType: 'url', label: tr => tr.onboarding_contact_website },
]

export function StepContact({ tr, initialContact, onNext, onBack }: StepContactProps) {
  const [contact, setContact] = useState<OnboardingContact>(initialContact)

  function set(key: ContactField, value: string) {
    setContact(prev => ({ ...prev, [key]: value.trim() || undefined }))
  }

  const hasAtLeastOne = FIELDS.some(f => !!contact[f.key])

  function handleNext() {
    if (!hasAtLeastOne) return
    onNext(contact)
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step4_title}</h2>

      <div className="flex flex-col gap-3">
        {FIELDS.map(({ key, icon, inputType, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xl w-7 text-center shrink-0">{icon}</span>
            <input
              type={inputType}
              defaultValue={contact[key] ?? ''}
              onChange={e => set(key, e.target.value)}
              placeholder={label(tr)}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              dir="auto"
            />
          </div>
        ))}
      </div>

      {!hasAtLeastOne && (
        <p className="text-xs text-red-600">{tr.onboarding_contact_min_one}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_back}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasAtLeastOne}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {tr.onboarding_next}
        </button>
      </div>
    </div>
  )
}
