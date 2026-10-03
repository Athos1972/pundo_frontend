import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SampleComparison } from '@/components/shop-admin/catalog-review/SampleComparison'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { CatalogCaseSampleItem, CatalogCaseSampleResponse } from '@/types/shop-admin'

const tr = tAdmin('de')

function makeItem(overrides: Partial<CatalogCaseSampleItem> = {}): CatalogCaseSampleItem {
  return {
    catalog_case_item_id: 1,
    item_id: 100,
    raw_name: 'Raw Name',
    raw_description: 'Raw description',
    raw_category_path: 'Home > Kitchen',
    names: { en: 'Enriched Name', de: 'Angereicherter Name' },
    descriptions: { en: 'Enriched description' },
    category_id: 5,
    category_path: 'Home / Kitchen',
    attributes: { color: 'red' },
    status: 'ready_for_review',
    last_error: null,
    ...overrides,
  }
}

function makeSample(items: CatalogCaseSampleItem[], requested = 10): CatalogCaseSampleResponse {
  return {
    catalog_case_id: 1,
    sample: items,
    sample_size_requested: requested,
    sample_size_returned: items.length,
  }
}

describe('SampleComparison — Sprachabdeckung (§0.1 / R1)', () => {
  it('leitet die Sprachabdeckung aus den names-Dicts der Stichprobe ab und kennzeichnet sie als Stichprobe', () => {
    render(<SampleComparison sample={makeSample([makeItem()])} tr={tr} />)
    // 2 languages present (en, de) out of 6
    expect(screen.getByText('2/6 Sprachen (Stichprobe)')).toBeInTheDocument()
  })

  it('zählt Sprachen über mehrere Sample-Items hinweg (Union, nicht nur erstes Item)', () => {
    const items = [
      makeItem({ catalog_case_item_id: 1, names: { en: 'A' } }),
      makeItem({ catalog_case_item_id: 2, names: { ru: 'Б' } }),
    ]
    render(<SampleComparison sample={makeSample(items)} tr={tr} />)
    expect(screen.getByText('2/6 Sprachen (Stichprobe)')).toBeInTheDocument()
  })

  it('zeigt 0/6 wenn kein Item Namen hat', () => {
    render(<SampleComparison sample={makeSample([makeItem({ names: null })])} tr={tr} />)
    expect(screen.getByText('0/6 Sprachen (Stichprobe)')).toBeInTheDocument()
  })
})

describe('SampleComparison — Stichproben-Zähler (AC 10)', () => {
  it('zeigt returned/requested korrekt', () => {
    render(<SampleComparison sample={makeSample([makeItem(), makeItem({ catalog_case_item_id: 2 })], 10)} tr={tr} />)
    expect(screen.getByText('Stichprobe: 2/10 Produkte')).toBeInTheDocument()
  })
})

describe('SampleComparison — Fehler-Isolation (Edge Case 1 / AC 6)', () => {
  it('zeigt einen Hinweis bei last_error, blockiert aber nicht die restliche Anzeige', () => {
    render(<SampleComparison sample={makeSample([makeItem({ last_error: 'attribute.extract timeout' })])} tr={tr} />)
    expect(screen.getByText(tr.catalog_review_item_error)).toBeInTheDocument()
    expect(screen.getByText('Raw Name')).toBeInTheDocument()
  })

  it('zeigt keinen Fehlerhinweis wenn last_error null ist', () => {
    render(<SampleComparison sample={makeSample([makeItem({ last_error: null })])} tr={tr} />)
    expect(screen.queryByText(tr.catalog_review_item_error)).not.toBeInTheDocument()
  })
})

describe('SampleComparison — Vorher/Nachher-Inhalte', () => {
  it('zeigt Roh- und angereicherte Felder nebeneinander', () => {
    render(<SampleComparison sample={makeSample([makeItem()])} tr={tr} />)
    expect(screen.getByText('Raw Name')).toBeInTheDocument()
    expect(screen.getByText('Raw description')).toBeInTheDocument()
    expect(screen.getByText('Enriched Name')).toBeInTheDocument()
    expect(screen.getByText(/Home \/ Kitchen/)).toBeInTheDocument()
  })

  it('zeigt einen dezenten Platzhalter für fehlende Sprachen statt zu crashen', () => {
    render(<SampleComparison sample={makeSample([makeItem({ names: { en: 'Only English' } })])} tr={tr} />)
    // 5 of 6 language rows should render the "—" placeholder
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(5)
  })
})
