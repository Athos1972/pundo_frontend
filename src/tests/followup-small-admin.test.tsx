import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: vi.fn() }))
vi.mock('next/image', () => ({
  default: (p: { src: string; alt: string }) => React.createElement('img', { src: p.src, alt: p.alt }),
}))
vi.mock('next/dynamic', () => ({
  default: () => (p: { lat: number; lng: number }) =>
    React.createElement('div', { 'data-testid': 'map', 'data-lat': String(p.lat), 'data-lng': String(p.lng) }),
}))

import { LocationEditor } from '@/components/system-admin/LocationEditor'
import { BrandForm } from '@/components/system-admin/BrandForm'
import { ProductForm } from '@/components/system-admin/ProductForm'
import { CategoryForm } from '@/components/system-admin/CategoryForm'
import { BrandLogoInput } from '@/components/system-admin/BrandLogoInput'
import { AttributeDefinitionEditor, type AttrDefDraft } from '@/components/system-admin/AttributeDefinitionEditor'
import { ChannelEditor } from '@/components/system-admin/crm/ChannelEditor'
import { rec } from './helpers/crm-recorded'
import { LARNACA } from '@/lib/default-location'

describe('LocationEditor default position', () => {
  it('starts in Larnaca (central constant), not Vienna', () => {
    render(
      <LocationEditor lat={null} lng={null} onChange={vi.fn()} searchPlaceholder="s" noResultsLabel="n" latLabel="Lat" lngLabel="Lng" />,
    )
    const map = screen.getByTestId('map')
    expect(map.getAttribute('data-lat')).toBe(String(LARNACA.lat))
    expect(map.getAttribute('data-lng')).toBe(String(LARNACA.lng))
    expect(LARNACA.lat).toBeCloseTo(34.9, 1)
  })
})

describe('system-admin validation messages are i18n', () => {
  it('has the keys in en and el, non-identical', () => {
    for (const k of ['error_name_required', 'error_slug_required', 'error_external_id_required'] as const) {
      const en = tSysAdmin('en')[k]
      const el = tSysAdmin('el')[k]
      expect(en, k).toBeTruthy()
      expect(el, k).toBeTruthy()
      expect(el).not.toBe(en)
    }
  })

  it('BrandForm shows the Greek message', async () => {
    const tr = tSysAdmin('el')
    const { container } = render(<BrandForm brand={null} tr={tr} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText(tr.error_name_required)).toBeTruthy()
  })

  it('ProductForm shows Greek name and slug messages', async () => {
    const tr = tSysAdmin('el')
    const { container } = render(<ProductForm product={null} attributes={[]} categories={[]} brands={[]} tr={tr} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText(tr.error_name_required)).toBeTruthy()
    expect(screen.getByText(tr.error_slug_required)).toBeTruthy()
  })

  it('CategoryForm shows the Greek external id message', async () => {
    const tr = tSysAdmin('el')
    const { container } = render(<CategoryForm category={null} allCategories={[]} translations={[]} attrDefs={[]} tr={tr} />)
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText(tr.error_external_id_required)).toBeTruthy()
  })
})

describe('system-admin label association (a11y)', () => {
  it('BrandLogoInput: URL input is reachable via its label', () => {
    render(
      <BrandLogoInput brandId={1} value="" onChange={vi.fn()} urlTabLabel="UrlTab" uploadTabLabel="UpTab"
        logoUrlLabel="Logo URL" logoPreviewLabel="Prev" uploadLabel="Upl" uploadingLabel="..." errorMessage="e" saveFirstLabel="s" />,
    )
    expect(screen.getByLabelText('Logo URL')).toBeTruthy()
  })

  it('AttributeDefinitionEditor: all fields reachable via label', () => {
    const v: AttrDefDraft = {
      attribute_key: '', attribute_type: 'select', allowed_values: null, unit: null, is_filterable: true,
      display_order: 0, override_mode: 'inherit', labels: {}, value_labels: null, created_at: '', updated_at: '',
    }
    render(
      <AttributeDefinitionEditor value={v} onChange={vi.fn()} keyLabel="Key" labelLabel="Label" typeLabel="Type"
        optionsLabel="Options" optionsHint="" optionsPlaceholder="" />,
    )
    for (const l of ['Key', 'Label', 'Type', 'Options']) {
      expect(screen.getByLabelText(new RegExp(l)), l).toBeTruthy()
    }
  })

  it('two editors on one page keep ids unique', () => {
    const v: AttrDefDraft = {
      attribute_key: '', attribute_type: 'text', allowed_values: null, unit: null, is_filterable: true,
      display_order: 0, override_mode: 'inherit', labels: {}, value_labels: null, created_at: '', updated_at: '',
    }
    const props = { value: v, onChange: vi.fn(), keyLabel: 'Key', labelLabel: 'Label', typeLabel: 'Type', optionsLabel: 'O', optionsHint: '', optionsPlaceholder: '' }
    render(<><AttributeDefinitionEditor {...props} /><AttributeDefinitionEditor {...props} /></>)
    expect(screen.getAllByLabelText(/Key/).length).toBe(2)
  })
})

describe('ChannelEditor label association (a11y)', () => {
  const mockFetch = vi.fn()
  beforeEach(() => vi.stubGlobal('fetch', mockFetch))
  afterEach(() => vi.unstubAllGlobals())
  it('add form: kind select and value input reachable via label', async () => {
    const tr = tSysAdmin('en')
    const org = rec.orgDetail()
    render(<ChannelEditor owner={{ type: 'org', id: org.id }} channels={org.channels} tr={tr} canWrite />)
    fireEvent.click(screen.getByText(new RegExp(tr.crm_channel_add)))
    await waitFor(() => expect(screen.getByLabelText(tr.crm_channel_kind)).toBeTruthy())
    expect(screen.getByLabelText(tr.crm_channel_value)).toBeTruthy()
  })
})
