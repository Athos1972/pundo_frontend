/**
 * Unit-Tests: Service-Katalog Auto-Assign (F5910, spec service-katalog-auto-assign-20260502)
 *
 * Abgedeckt:
 * - sourceBadge renders 'auto_seeded' mit korrektem Label + amber CSS-Klassen
 * - sourceBadge-Fallback für unbekannte source bleibt unverändert
 * - ItemSource type guard: 'auto_seeded' ist valider Wert
 * - SysAdminItemDomainMapping shape: required + optional fields
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

// ─── sourceBadge — extracted via OfferList render ────────────────────────────
import { OfferList } from '@/components/shop-admin/OfferList'
import type { AdminOffer } from '@/types/shop-admin'

function makeOffer(source: AdminOffer['source'], id = 1): AdminOffer {
  return {
    id,
    shop_listing_id: 10,
    title: `Test Offer ${id}`,
    description: null,
    price_type: 'on_request',
    price_tiers: [],
    currency: 'EUR',
    valid_from: null,
    valid_until: null,
    source,
    offer_url: null,
    archived: false,
    crawled_at: null,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('OfferList — sourceBadge auto_seeded', () => {
  it('renders "Suggested" label for auto_seeded source (EN)', () => {
    render(
      <OfferList
        activeItems={[makeOffer('auto_seeded')]}
        expiredItems={[]}
        lang="en"
      />,
    )
    expect(screen.getByText('Suggested')).toBeDefined()
  })

  it('renders "Vorgeschlagen" label for auto_seeded source (DE)', () => {
    render(
      <OfferList
        activeItems={[makeOffer('auto_seeded', 2)]}
        expiredItems={[]}
        lang="de"
      />,
    )
    expect(screen.getByText('Vorgeschlagen')).toBeDefined()
  })

  it('renders amber CSS class for auto_seeded badge', () => {
    const { container } = render(
      <OfferList
        activeItems={[makeOffer('auto_seeded', 3)]}
        expiredItems={[]}
        lang="en"
      />,
    )
    const badge = container.querySelector('.bg-amber-100')
    expect(badge).not.toBeNull()
    expect(badge?.className).toContain('text-amber-700')
  })

  it('does not render amber class for shop_manual source', () => {
    const { container } = render(
      <OfferList
        activeItems={[makeOffer('shop_manual', 4)]}
        expiredItems={[]}
        lang="en"
      />,
    )
    expect(container.querySelector('.bg-amber-100')).toBeNull()
  })

  it('renders all other source badges unaffected', () => {
    const sources: AdminOffer['source'][] = ['scraper', 'shop_manual', 'shop_upload', 'spotted', 'admin']
    sources.forEach((source, idx) => {
      const { container } = render(
        <OfferList
          activeItems={[makeOffer(source, 100 + idx)]}
          expiredItems={[]}
          lang="en"
        />,
      )
      expect(container.querySelector('.bg-amber-100')).toBeNull()
    })
  })
})

// ─── ItemSource type coverage ─────────────────────────────────────────────────
import type { ItemSource } from '@/types/shop-admin'

describe('ItemSource — type includes auto_seeded', () => {
  it('auto_seeded is a valid ItemSource at runtime', () => {
    const source: ItemSource = 'auto_seeded'
    expect(source).toBe('auto_seeded')
  })

  it('all legacy sources still valid', () => {
    const sources: ItemSource[] = ['scraper', 'admin', 'shop_manual', 'shop_upload', 'spotted', 'auto_seeded']
    expect(sources).toHaveLength(6)
  })
})

// ─── SysAdminItemDomainMapping shape ─────────────────────────────────────────
import type { SysAdminItemDomainMapping, SysAdminItemDomainMappingCreate, MappingGapEntry } from '@/types/system-admin'

describe('SysAdminItemDomainMapping — type shape', () => {
  it('accepts a fully populated mapping object', () => {
    const m: SysAdminItemDomainMapping = {
      id: 1,
      item_id: 42,
      item_name: 'PV-Anlage installieren',
      domain_id: 5,
      onboarding_domain_id: 5,
      onboarding_domain_slug: 'elektriker',
      specialty_id: 12,
      specialty_slug: 'pv-anlagen',
      priority: 10,
      auto_assign: true,
      created_at: '2026-05-02T00:00:00Z',
    }
    expect(m.auto_assign).toBe(true)
    expect(m.item_name).toBe('PV-Anlage installieren')
  })

  it('accepts a mapping with null optional fields', () => {
    const m: SysAdminItemDomainMapping = {
      id: 2,
      item_id: 43,
      item_name: null,
      domain_id: null,
      specialty_id: null,
      priority: 0,
      auto_assign: false,
      created_at: '2026-05-02T00:00:00Z',
    }
    expect(m.item_name).toBeNull()
    expect(m.domain_id).toBeNull()
  })

  it('SysAdminItemDomainMappingCreate requires item_id and auto_assign', () => {
    const create: SysAdminItemDomainMappingCreate = {
      item_id: 99,
      auto_assign: true,
    }
    expect(create.item_id).toBe(99)
    expect(create.auto_assign).toBe(true)
  })

  it('SysAdminItemDomainMappingCreate accepts all optional fields', () => {
    const create: SysAdminItemDomainMappingCreate = {
      item_id: 99,
      domain_id: 1,
      specialty_id: 2,
      priority: 5,
      auto_assign: true,
    }
    expect(create.priority).toBe(5)
  })

  it('MappingGapEntry shape includes auto_assign_item_count', () => {
    const gap: MappingGapEntry = {
      kind: 'domain',
      slug: 'elektriker',
      domain_id: 3,
      specialty_id: null,
      onboarding_domain_id: 3,
      onboarding_domain_slug: 'elektriker',
      auto_assign_item_count: 0,
    }
    expect(gap.auto_assign_item_count).toBe(0)
  })
})

// ─── Translations: source_auto_seeded alle 6 Sprachen ────────────────────────
import { tAdmin } from '@/lib/shop-admin-translations'

describe('shop-admin translations — source_auto_seeded', () => {
  const cases: [string, string][] = [
    ['en', 'Suggested'],
    ['de', 'Vorgeschlagen'],
    ['el', 'Προτεινόμενο'],
    ['ru', 'Предложено'],
    ['ar', 'مقترح'],
    ['he', 'מוצע'],
  ]

  it.each(cases)('lang=%s → %s', (lang, expected) => {
    const tr = tAdmin(lang)
    expect(tr.source_auto_seeded).toBe(expected)
  })
})

// ─── System-Admin Translations: IDM keys ─────────────────────────────────────
import { tSysAdmin } from '@/lib/system-admin-translations'

describe('system-admin translations — IDM keys', () => {
  it('nav_item_domain_mappings present in EN', () => {
    const tr = tSysAdmin('en')
    expect(tr.nav_item_domain_mappings).toBe('Service Catalog')
  })

  it('nav_item_domain_mappings present in DE', () => {
    const tr = tSysAdmin('de')
    expect(tr.nav_item_domain_mappings).toBe('Dienst-Katalog')
  })

  it('idm_title present in EN', () => {
    expect(tSysAdmin('en').idm_title).toBe('Item-Domain Mappings')
  })

  it('idm_auto_assign present in both langs', () => {
    expect(tSysAdmin('en').idm_auto_assign).toBe('Auto-assign')
    expect(tSysAdmin('de').idm_auto_assign).toBe('Auto-Zuweisung')
  })

  it('idm_gaps_title present in EN', () => {
    expect(tSysAdmin('en').idm_gaps_title).toBe('Mapping Gaps')
  })
})
