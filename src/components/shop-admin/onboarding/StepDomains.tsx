'use client'

import { useEffect, useState } from 'react'
import type { OnboardingDomain, OnboardingProviderType } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { getDomains, OTHER_DOMAIN_SLUG, OTHER_OFFER_MAX_LENGTH } from '@/lib/onboarding/domains'
import { domainsMissingSpecialty } from '@/lib/onboarding/specialtyGate'
import { DomainChip } from './DomainChip'

interface StepDomainsProps {
  tr: ShopAdminTranslations
  lang: string
  providerType: OnboardingProviderType
  selectedDomainSlugs: string[]
  selectedSpecialtySlugs: string[]
  /** F2970: previously entered "Other" free text (draft). */
  selectedOtherOfferText?: string
  /** `otherOfferText` is only passed (3rd argument) when "Other" is selected and the text is non-empty. */
  onNext: (domainSlugs: string[], specialtySlugs: string[], otherOfferText?: string) => void
  onBack: () => void
}

export function StepDomains({ tr, lang, providerType, selectedDomainSlugs, selectedSpecialtySlugs, selectedOtherOfferText = '', onNext, onBack }: StepDomainsProps) {
  const [domains, setDomains] = useState<OnboardingDomain[]>([])
  const [domainSlugs, setDomainSlugs] = useState<string[]>(selectedDomainSlugs)
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>(selectedSpecialtySlugs)
  const [showSpecialties, setShowSpecialties] = useState(false)
  const [otherOfferText, setOtherOfferText] = useState(selectedOtherOfferText)
  // Derived: show skeleton while domains haven't loaded yet (cleanup resets to [] on dep change)
  const loading = domains.length === 0

  useEffect(() => {
    getDomains(lang, providerType).then(d => { setDomains(d) })
    return () => { setDomains([]) }
  }, [lang, providerType])

  const isOtherSelected = domainSlugs.includes(OTHER_DOMAIN_SLUG)

  // Domains that have specialties and are currently selected — never for "Other"
  const specialtyDomains = isOtherSelected
    ? []
    : domains.filter(d => domainSlugs.includes(d.slug) && d.specialties.length > 0)
  const hasSpecialties = specialtyDomains.length > 0
  // B5910-004: domains that need a specialty before the wizard may continue
  const missingSpecialty = isOtherSelected ? [] : domainsMissingSpecialty(domains, domainSlugs, specialtySlugs)
  const specialtyGateActive = showSpecialties && missingSpecialty.length > 0
  const hasRequiredDomain = specialtyDomains.some(d => d.specialtyRequired)

  function toggleDomain(slug: string) {
    setDomainSlugs(prev => {
      // Clear "Other" if a real domain is selected
      const withoutOther = prev.filter(s => s !== OTHER_DOMAIN_SLUG)
      return withoutOther.includes(slug)
        ? withoutOther.filter(s => s !== slug)
        : [...withoutOther, slug]
    })
    // Remove orphaned specialties when domain is deselected
    setSpecialtySlugs(prev => {
      const domain = domains.find(d => d.slug === slug)
      if (!domain) return prev
      const domainSpecSlugs = domain.specialties.map(s => s.slug)
      return prev.filter(s => !domainSpecSlugs.includes(s))
    })
  }

  function toggleOther() {
    if (isOtherSelected) {
      setDomainSlugs([])
    } else {
      setDomainSlugs([OTHER_DOMAIN_SLUG])
      setSpecialtySlugs([])
    }
  }

  function toggleSpecialty(slug: string) {
    setSpecialtySlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  function handleNext() {
    if (specialtyGateActive) return
    if (hasSpecialties && !showSpecialties) {
      setShowSpecialties(true)
      return
    }
    const text = otherOfferText.trim()
    if (isOtherSelected && text) {
      onNext(domainSlugs, specialtySlugs, text)
    } else {
      onNext(domainSlugs, specialtySlugs)
    }
  }

  const stepTitle = showSpecialties
    ? (hasRequiredDomain ? tr.onboarding_step2_5_title_required : tr.onboarding_step2_5_title)
    : tr.onboarding_step2_title

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
            <>
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
              <hr className="border-gray-100" />
              <div className="flex flex-wrap gap-2">
                <DomainChip
                  label={tr.onboarding_domain_other}
                  selected={isOtherSelected}
                  onToggle={toggleOther}
                  variant="other"
                />
              </div>
              {isOtherSelected && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-500">{tr.onboarding_domain_other_hint}</p>
                  {/* F2970: optional free text - feeds the service gap report */}
                  <label htmlFor="onboarding-other-offer" className="text-sm font-medium text-gray-700">
                    {tr.onboarding_other_offer_label}
                  </label>
                  <input
                    id="onboarding-other-offer"
                    type="text"
                    value={otherOfferText}
                    maxLength={OTHER_OFFER_MAX_LENGTH}
                    onChange={e => setOtherOfferText(e.target.value)}
                    placeholder={tr.onboarding_other_offer_placeholder}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}
            </>
          )}
          {domainSlugs.length === 0 && !loading && (
            <p className="text-xs text-red-600">{tr.onboarding_domains_min_one}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {specialtyGateActive && (
            <p role="alert" data-testid="specialty-required-hint" className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">
              {tr.onboarding_specialty_required_hint.replace('{domains}', missingSpecialty.map(d => d.label).join(', '))}
            </p>
          )}
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
          disabled={domainSlugs.length === 0 || specialtyGateActive}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showSpecialties ? tr.onboarding_next : (hasSpecialties ? tr.onboarding_next : tr.onboarding_next)}
        </button>
      </div>
    </div>
  )
}
