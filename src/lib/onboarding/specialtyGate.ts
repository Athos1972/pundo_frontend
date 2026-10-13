import type { OnboardingDomain } from '@/types/shop-admin'

/**
 * B5910-004 gate: selected domains that require a specialty but have none chosen yet.
 * "Other" and domains without specialties never block (nothing to choose).
 */
export function domainsMissingSpecialty(
  domains: OnboardingDomain[],
  domainSlugs: string[],
  specialtySlugs: string[],
): OnboardingDomain[] {
  return domains.filter(
    d =>
      d.specialtyRequired === true &&
      d.specialties.length > 0 &&
      domainSlugs.includes(d.slug) &&
      !d.specialties.some(s => specialtySlugs.includes(s.slug)),
  )
}
