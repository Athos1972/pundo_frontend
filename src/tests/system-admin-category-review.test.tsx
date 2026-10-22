import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }))
vi.mock('@/components/system-admin/Toast', () => ({ showToast: toast }))

import { CategoryReviewList } from '@/components/system-admin/CategoryReviewList'
import type { SysAdminCategoryReviewItem } from '@/types/system-admin'

const tr = tSysAdmin('en')

const ROW: SysAdminCategoryReviewItem = {
  item_id: 7, name: 'Georplast Villa', product_url: 'https://shop.example/villa',
  proposed_category_id: 55, proposed_category_path: 'Animals & Pet Supplies > Cat Litter Boxes',
  descent_confidence: 0.68, first_confidence: 0.55,
}
const ROW2: SysAdminCategoryReviewItem = { ...ROW, item_id: 8, name: 'No proposal item', proposed_category_id: null, proposed_category_path: null }

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  toast.mockReset()
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('CategoryReviewList (B5982-001)', () => {
  it('shows name, proposal and both confidences', () => {
    render(<CategoryReviewList items={[ROW]} tr={tr} />)
    expect(screen.getByText('Georplast Villa')).toBeInTheDocument()
    expect(screen.getByText(/Animals & Pet Supplies > Cat Litter Boxes/)).toBeInTheDocument()
    expect(screen.getByText(/68 %.*final.*55 %.*first/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: tr.crv_open_product })).toHaveAttribute('href', 'https://shop.example/villa')
  })

  it('accept posts to the admin proxy and removes the row', async () => {
    render(<CategoryReviewList items={[ROW]} tr={tr} />)
    await userEvent.click(screen.getByRole('button', { name: tr.crv_accept }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/category-review/7/accept', { method: 'POST' }))
    await waitFor(() => expect(screen.getByText(tr.crv_empty)).toBeInTheDocument())
    expect(toast).toHaveBeenCalledWith(tr.crv_saved, 'success')
  })

  it('reject posts and removes the row', async () => {
    render(<CategoryReviewList items={[ROW]} tr={tr} />)
    await userEvent.click(screen.getByRole('button', { name: tr.crv_reject }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/category-review/7/reject', { method: 'POST' }))
  })

  it('accept is disabled without a proposal and the other-category button needs a chosen category', () => {
    render(<CategoryReviewList items={[ROW2]} tr={tr} />)
    expect(screen.getByText(tr.crv_no_proposal)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tr.crv_accept })).toBeDisabled()
    expect(screen.getByRole('button', { name: tr.crv_assign })).toBeDisabled()
  })

  it('keeps the row and shows an error toast when saving fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    render(<CategoryReviewList items={[ROW]} tr={tr} />)
    await userEvent.click(screen.getByRole('button', { name: tr.crv_accept }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(tr.crv_error, 'error'))
    expect(screen.getByText('Georplast Villa')).toBeInTheDocument()
  })

  it('shows the empty message for an empty queue', () => {
    render(<CategoryReviewList items={[]} tr={tr} />)
    expect(screen.getByText(tr.crv_empty)).toBeInTheDocument()
  })

  it('has Greek strings for every key', () => {
    const en: Record<string, unknown> = tr
    const el: Record<string, unknown> = tSysAdmin('el')
    for (const key of Object.keys(en).filter((k) => k.startsWith('crv_') || k === 'nav_category_review')) {
      expect(el[key]).toBeTruthy()
      expect(el[key]).not.toBe(en[key])
    }
  })
})
