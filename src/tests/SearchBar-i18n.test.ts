import { describe, it, expect } from 'vitest'
import { tSearch } from '@/lib/translations'

describe('SearchBar dropdown i18n', () => {
  it('returns English labels for lang=en', () => {
    const tr = tSearch('en')
    expect(tr.dropdown_categories).toBe('Categories')
    expect(tr.dropdown_shops).toBe('Shops')
    expect(tr.dropdown_products).toBe('Products')
    expect(tr.dropdown_all_results('Cat food')).toBe('All results for "Cat food" →')
  })

  it('returns German labels for lang=de', () => {
    const tr = tSearch('de')
    expect(tr.dropdown_categories).toBe('Kategorien')
    expect(tr.dropdown_shops).toBe('Shops')
    expect(tr.dropdown_products).toBe('Produkte')
    expect(tr.dropdown_all_results('Katzenfutter')).toBe('Alle Ergebnisse für „Katzenfutter" →')
  })

  it('returns Russian labels for lang=ru', () => {
    const tr = tSearch('ru')
    expect(tr.dropdown_categories).toBe('Категории')
    expect(tr.dropdown_products).toBe('Товары')
    expect(tr.dropdown_all_results('корм')).toBe('Все результаты для «корм» →')
  })

  it('returns Greek labels for lang=el', () => {
    const tr = tSearch('el')
    expect(tr.dropdown_categories).toBe('Κατηγορίες')
    expect(tr.dropdown_products).toBe('Προϊόντα')
  })

  it('returns Arabic labels for lang=ar', () => {
    const tr = tSearch('ar')
    expect(tr.dropdown_categories).toBe('الفئات')
    expect(tr.dropdown_products).toBe('المنتجات')
  })

  it('returns Hebrew labels for lang=he', () => {
    const tr = tSearch('he')
    expect(tr.dropdown_categories).toBe('קטגוריות')
    expect(tr.dropdown_products).toBe('מוצרים')
  })

  it('falls back to English for unknown lang', () => {
    const tr = tSearch('xx')
    expect(tr.dropdown_categories).toBe('Categories')
    expect(tr.dropdown_products).toBe('Products')
  })
})
