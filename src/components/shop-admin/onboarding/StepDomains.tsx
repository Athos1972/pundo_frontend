'use client'

import { useEffect, useState } from 'react'
import type { OnboardingDomain, OnboardingProviderType } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { getDomains } from '@/lib/onboarding/domains'
import { DomainChip } from './DomainChip'

interface StepDomainsProps {
  tr: ShopAdminTranslations
  lang: string
  providerType: OnboardingProviderType
  selectedDomainSlugs: string[]
  selectedSpecialtySlugs: string[]
  onNext: (domainSlugs: string[], specialtySlugs: string[]) => void
  onBack: () => void
}

export function StepDomains({ tr, lang, providerType, selectedDomainSlugs, selectedSpecialtySlugs, onNext, onBack }: StepDomainsProps) {
  const [domains, setDomains] = useState<OnboardingDomain[]>([])
  const [domainSlugs, setDomainSlugs] = useState<string[]>(selectedDomainSlugs)
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>(selectedSpecialtySlugs)
  const [showSpecialties, setShowSpecialties] = useState(false)
  // Derived: show skeleton while domains haven't loaded yet (cleanup resets to [] on dep change)
  const loading = domains.length === 0

  useEffect(() => {
    getDomains(lang, providerType).then(d => { setDomains(d) })
    return () => { setDomains([]) }
  }, [lang, providerType])

  // Domains that have specialties and are currently selected
  const specialtyDomains = domains.filter(d => domainSlugs.includes(d.slug) && d.specialties.length > 0)
  const hasSpecialties = specialtyDomains.length > 0

  function toggleDomain(slug: string) {
    setDomainSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
    // Remove orphaned specialties when domain is deselected
    setSpecialtySlugs(prev => {
      const domain = domains.find(d => d.slug === slug)
      if (!domain) return prev
      const domainSpecSlugs = domain.specialties.map(s => s.slug)
      return prev.filter(s => !domainSpecSlugs.includes(s))
    })
  }

  function toggleSpecialty(slug: string) {
    setSpecialtySlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  function handleNext() {
    if (hasSpecialties && !showSpecialties) {
      setShowSpecialties(true)
      return
    }
    onNext(domainSlugs, specialtySlugs)
  }

  const stepTitle = showSpecialties ? tr.onboarding_step2_5_title : tr.onboarding_step2_title

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-900">{stepTitle}</h2>

      {!showSpecialties ? (
        <>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-11 w-32 rounded-full bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domains.map(domain => (
                <DomainChip
                  key={domain.slug}
                  label={domain.label}
                  selected={domainSlugs.includes(domain.slug)}
                  onToggle={() => toggleDomain(domain.slug)}
                />
              ))}
            </div>
          )}
          {domainSlugs.length === 0 && !loading && (
            <p className="text-xs text-red-600">{tr.onboarding_domains_min_one}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {specialtyDomains.map(domain => (
            <div key={domain.slug} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-700">{domain.label}</p>
              <div className="flex flex-wrap gap-2">
                {domain.specialties.map(spec => (
                  <DomainChip
                    key={spec.slug}
                    label={spec.label}
                    selected={specialtySlugs.includes(spec.slug)}
                    onToggle={() => toggleSpecialty(spec.slug)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={showSpecialties ? () => setShowSpecialties(false) : onBack}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_back}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={domainSlugs.length === 0}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showSpecialties ? tr.onboarding_next : (hasSpecialties ? tr.onboarding_next : tr.onboarding_next)}
        </button>
      </div>
    </div>
  )
}
