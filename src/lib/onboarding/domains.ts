import type { OnboardingDomain, OnboardingProviderType } from '@/types/shop-admin'

// Static fallback — used when backend endpoint is not yet available
const FALLBACK_DOMAINS: Record<OnboardingProviderType, OnboardingDomain[]> = {
  handwerker: [
    { slug: 'elektriker', label: 'Elektriker / Electrician', specialties: [{ slug: 'solar', label: 'Solaranlagen' }, { slug: 'pv', label: 'PV-Speicher' }] },
    { slug: 'installateur', label: 'Installateur (Gas/Wasser/Heizung)', specialties: [{ slug: 'heizung', label: 'Heizung' }, { slug: 'sanitaer', label: 'Sanitär' }] },
    { slug: 'fliesen', label: 'Fliesenleger', specialties: [] },
    { slug: 'tischler', label: 'Tischler / Schreiner', specialties: [] },
    { slug: 'maler', label: 'Maler', specialties: [{ slug: 'innen', label: 'Innen' }, { slug: 'aussen', label: 'Außen' }] },
    { slug: 'dachdecker', label: 'Dachdecker', specialties: [{ slug: 'isolation', label: 'Isolation' }] },
    { slug: 'maurer', label: 'Maurer', specialties: [] },
    { slug: 'moebel', label: 'Möbelaufsteller / Umzug', specialties: [] },
  ],
  dienstleister: [
    { slug: 'friseur', label: 'Friseur', specialties: [{ slug: 'extensions', label: 'Extensions' }, { slug: 'farbe', label: 'Färben' }] },
    { slug: 'nagelstudio', label: 'Nagelstudio', specialties: [{ slug: 'gel', label: 'Gel-Nägel' }, { slug: 'acryl', label: 'Acryl' }] },
    { slug: 'buchhalter', label: 'Buchhalter', specialties: [{ slug: 'expat', label: 'Expat-Fokus' }, { slug: 'steuern', label: 'Steuerberatung' }] },
    { slug: 'versicherung', label: 'Versicherungsberater', specialties: [] },
    { slug: 'tattoo', label: 'Tattoo Artist', specialties: [] },
    { slug: 'putzerei', label: 'Reinigung / Putzerei', specialties: [] },
  ],
  haendler: [
    { slug: 'lebensmittel', label: 'Lebensmittel / Supermarkt', specialties: [] },
    { slug: 'baumaterial', label: 'Baumaterial', specialties: [] },
    { slug: 'elektro', label: 'Elektromaterial', specialties: [] },
    { slug: 'kleidung', label: 'Kleidung / Mode', specialties: [] },
    { slug: 'haushalt', label: 'Haushaltswaren', specialties: [] },
  ],
  gastro: [
    { slug: 'grill', label: 'Grill / Fleisch', specialties: [] },
    { slug: 'suessigkeiten', label: 'Süßigkeiten / Desserts', specialties: [] },
    { slug: 'vegetarisch', label: 'Vegetarisch', specialties: [] },
    { slug: 'vegan', label: 'Vegan', specialties: [] },
    { slug: 'low_carb', label: 'Low-Carb', specialties: [] },
    { slug: 'low_fat', label: 'Low-Fat', specialties: [] },
  ],
}

// In-memory cache per [lang, providerType]
const cache = new Map<string, OnboardingDomain[]>()

export async function getDomains(lang: string, providerType: OnboardingProviderType): Promise<OnboardingDomain[]> {
  const key = `${lang}:${providerType}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const res = await fetch(`/api/shop-admin/onboarding/domains?lang=${lang}&type=${providerType}`)
    if (!res.ok) throw new Error('fetch failed')
    const data = ((await res.json()) as { domains: OnboardingDomain[] }).domains
    cache.set(key, data)
    return data
  } catch {
    // Backend not yet available — use static fallback
    const fallback = FALLBACK_DOMAINS[providerType] ?? []
    const sorted = [...fallback].sort((a, b) => a.label.localeCompare(b.label, lang))
    cache.set(key, sorted)
    return sorted
  }
}

export function sortDomains(domains: OnboardingDomain[], lang: string): OnboardingDomain[] {
  return [...domains].sort((a, b) => a.label.localeCompare(b.label, lang))
}

export function clearDomainsCache(): void {
  cache.clear()
}
