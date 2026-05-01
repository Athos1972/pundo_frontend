import type { OnboardingDomain, OnboardingProviderType } from '@/types/shop-admin'

// ─── Static fallback catalog (used when backend endpoint is unavailable) ─────
// Labels are in German (de) as the most common fallback language.
// The backend delivers fully localised labels in all 6 languages (en/de/el/ru/ar/he).
const FALLBACK_DOMAINS: Record<OnboardingProviderType, OnboardingDomain[]> = {
  handwerker: [
    {
      slug: 'elektriker', label: 'Elektriker',
      specialties: [
        { slug: 'solaranlagen', label: 'Solaranlagen' },
        { slug: 'smart-home',   label: 'Smart Home' },
      ],
    },
    {
      slug: 'klempner-sanitaer', label: 'Klempner & Sanitär',
      specialties: [
        { slug: 'badumbau', label: 'Badumbau' },
        { slug: 'heizung',  label: 'Heizung' },
      ],
    },
    {
      slug: 'maler-lackierer', label: 'Maler & Lackierer',
      specialties: [
        { slug: 'innen',      label: 'Innen' },
        { slug: 'aussen',     label: 'Außen' },
        { slug: 'tapezieren', label: 'Tapezieren' },
      ],
    },
    {
      slug: 'fliesenleger', label: 'Fliesenleger',
      specialties: [
        { slug: 'bad',      label: 'Bad' },
        { slug: 'terrasse', label: 'Terrasse' },
      ],
    },
    {
      slug: 'schreiner-tischler', label: 'Schreiner & Tischler',
      specialties: [
        { slug: 'kuechen', label: 'Küchen' },
        { slug: 'moebel',  label: 'Möbel' },
      ],
    },
    {
      slug: 'dachdecker', label: 'Dachdecker',
      specialties: [
        { slug: 'isolation', label: 'Isolation' },
        { slug: 'solar',     label: 'Solar' },
      ],
    },
    { slug: 'maurer-bau', label: 'Maurer & Bau', specialties: [] },
    {
      slug: 'klimatechnik-ac', label: 'Klimatechnik & AC',
      specialties: [
        { slug: 'installation', label: 'Installation' },
        { slug: 'wartung',      label: 'Wartung' },
      ],
    },
    { slug: 'schlosser-schluessel', label: 'Schlosser & Schlüsseldienst', specialties: [] },
    {
      slug: 'bodenbelag', label: 'Bodenbelag',
      specialties: [
        { slug: 'parkett',  label: 'Parkett' },
        { slug: 'laminat',  label: 'Laminat' },
        { slug: 'vinyl',    label: 'Vinyl' },
      ],
    },
    {
      slug: 'poolservice', label: 'Pool-Service',
      specialties: [
        { slug: 'bau',      label: 'Bau' },
        { slug: 'wartung',  label: 'Wartung' },
        { slug: 'reparatur',label: 'Reparatur' },
      ],
    },
    { slug: 'umzug-transport', label: 'Umzug & Transport', specialties: [] },
  ],

  dienstleister: [
    {
      slug: 'friseur', label: 'Friseur',
      specialties: [
        { slug: 'damen',      label: 'Damen' },
        { slug: 'herren',     label: 'Herren' },
        { slug: 'extensions', label: 'Extensions' },
        { slug: 'farbe',      label: 'Farbe & Strähnen' },
      ],
    },
    {
      slug: 'reinigung', label: 'Reinigung',
      specialties: [
        { slug: 'haushalt',       label: 'Haushalt' },
        { slug: 'gewerbe',        label: 'Gewerbe' },
        { slug: 'fenster',        label: 'Fenster' },
        { slug: 'buegelservice',  label: 'Bügelservice' },
      ],
    },
    { slug: 'buchhalter-steuer', label: 'Buchhalter & Steuerberater', specialties: [] },
    { slug: 'rechtsanwalt', label: 'Rechtsanwalt', specialties: [] },
    {
      slug: 'kosmetik-beauty', label: 'Kosmetik & Beauty',
      specialties: [
        { slug: 'gesicht', label: 'Gesichtsbehandlung' },
        { slug: 'waxing',  label: 'Waxing' },
        { slug: 'makeup',  label: 'Make-up' },
      ],
    },
    {
      slug: 'nagelstudio', label: 'Nagelstudio',
      specialties: [
        { slug: 'gel',         label: 'Gel-Nägel' },
        { slug: 'acryl',       label: 'Acryl' },
        { slug: 'naturnagel',  label: 'Naturnagel' },
      ],
    },
    {
      slug: 'massage', label: 'Massage',
      specialties: [
        { slug: 'sport',        label: 'Sportmassage' },
        { slug: 'wellness',     label: 'Wellness' },
        { slug: 'thaimassage',  label: 'Thaimassage' },
      ],
    },
    {
      slug: 'fotograf', label: 'Fotograf',
      specialties: [
        { slug: 'hochzeit',    label: 'Hochzeit' },
        { slug: 'portrait',    label: 'Portrait' },
        { slug: 'immobilien',  label: 'Immobilien' },
      ],
    },
    {
      slug: 'it-support', label: 'IT-Support',
      specialties: [
        { slug: 'reparatur', label: 'Reparatur' },
        { slug: 'netzwerk',  label: 'Netzwerk' },
        { slug: 'software',  label: 'Software' },
      ],
    },
    { slug: 'nachhilfe',    label: 'Nachhilfe & Unterricht', specialties: [] },
    { slug: 'hundesalon',   label: 'Hundesalon & Grooming',  specialties: [] },
    { slug: 'umzugshelfer', label: 'Umzugshelfer',           specialties: [] },
  ],

  haendler: [
    { slug: 'lebensmittel-supermarkt', label: 'Lebensmittel & Supermarkt', specialties: [] },
    { slug: 'baeckerei-konditorei',    label: 'Bäckerei & Konditorei',     specialties: [] },
    { slug: 'metzgerei',               label: 'Metzgerei & Fleischerei',   specialties: [] },
    { slug: 'apotheke',                label: 'Apotheke',                  specialties: [] },
    { slug: 'blumenladen',             label: 'Blumenladen',               specialties: [] },
    { slug: 'baumaterial',             label: 'Baumaterial & Werkzeug',    specialties: [] },
    { slug: 'elektronik-geraete',      label: 'Elektronik & Geräte',       specialties: [] },
    { slug: 'kleidung-mode',           label: 'Kleidung & Mode',           specialties: [] },
    { slug: 'haushaltwaren',           label: 'Haushaltswaren',            specialties: [] },
    { slug: 'spielzeug-hobby',         label: 'Spielzeug & Hobby',         specialties: [] },
  ],

  gastro: [
    { slug: 'restaurant-allgemein', label: 'Restaurant',               specialties: [] },
    { slug: 'cafe-kaffeehaus',      label: 'Café & Kaffeehaus',        specialties: [] },
    { slug: 'bar-pub',              label: 'Bar & Pub',                specialties: [] },
    { slug: 'pizzeria',             label: 'Pizzeria',                 specialties: [] },
    { slug: 'fast-food',            label: 'Fast Food',                specialties: [] },
    { slug: 'asiatisch-sushi',      label: 'Asiatisch & Sushi',        specialties: [] },
    { slug: 'grill-bbq',            label: 'Grill & BBQ',              specialties: [] },
    { slug: 'vegetarisch-vegan',    label: 'Vegetarisch & Vegan',      specialties: [] },
    { slug: 'strassenkueche',       label: 'Straßenküche & Kiosk',     specialties: [] },
    { slug: 'baeckerei-cafe',       label: 'Bäckerei-Café',            specialties: [] },
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
