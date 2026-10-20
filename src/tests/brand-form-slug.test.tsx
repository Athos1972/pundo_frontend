// B8100-001: Marke anlegen scheiterte mit 422, weil BrandForm keinen slug sendete (AdminBrandCreate verlangt ihn).
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

import { BrandForm } from '@/components/system-admin/BrandForm'
import type { SysAdminBrand } from '@/types/system-admin'

const tr = tSysAdmin('en')
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const sent = () => JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>
const nameInput = () => screen.getByLabelText(new RegExp(`^${tr.name}`)) as HTMLInputElement
const slugInput = () => screen.getByLabelText(new RegExp(`^${tr.slug}`)) as HTMLInputElement

describe('BrandForm slug (B8100-001)', () => {
  it('derives the slug from the name and sends it on create', async () => {
    render(<BrandForm brand={null} tr={tr} />)
    fireEvent.change(nameInput(), { target: { value: 'Royal Canin & Söhne' } })
    expect(slugInput().value).toBe('royal-canin-s-hne')
    fireEvent.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/brands')
    expect(sent()).toMatchObject({ slug: 'royal-canin-s-hne', names: { en: 'Royal Canin & Söhne' } })
  })

  it('keeps a slug the admin typed by hand when the name changes later', () => {
    render(<BrandForm brand={null} tr={tr} />)
    fireEvent.change(slugInput(), { target: { value: 'my-slug' } })
    fireEvent.change(nameInput(), { target: { value: 'Another Name' } })
    expect(slugInput().value).toBe('my-slug')
  })

  it('refuses to save without a slug', async () => {
    render(<BrandForm brand={null} tr={tr} />)
    fireEvent.change(nameInput(), { target: { value: '!!!' } }) // yields an empty slug
    fireEvent.submit(nameInput().closest('form') as HTMLFormElement) // skips the browser's own required check
    await waitFor(() => expect(screen.getByText(tr.error_slug_required)).toBeTruthy())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not show or send a slug when editing an existing brand', async () => {
    const brand = { id: 7, slug: 'existing', names: { en: 'Existing' }, country_code: null, created_at: '', updated_at: '' } as SysAdminBrand
    render(<BrandForm brand={brand} tr={tr} />)
    expect(screen.queryByLabelText(new RegExp(`^${tr.slug}`))).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: tr.save }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/brands/7')
    expect(sent()).not.toHaveProperty('slug')
  })
})
