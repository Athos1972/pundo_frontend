// F5970 AC 37: documents are only fetched on request (every view is audited); no iframe; PDFs open in a new tab
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ClaimDocumentList } from '@/components/system-admin/claims/ClaimDocumentList'
import { tSysAdmin } from '@/lib/system-admin-translations'
import type { SysAdminClaimDocument } from '@/types/system-admin'

const tr = tSysAdmin('en')
const doc = (over: Partial<SysAdminClaimDocument> = {}): SysAdminClaimDocument => ({
  id: 1, filename: 'schein.pdf', media_type: 'application/pdf', size_bytes: 20480, created_at: '2026-10-18T10:00:00Z', deleted_at: null, view_count: 0, ...over,
})
const show = (docs: SysAdminClaimDocument[], deletedAt: string | null = null) =>
  render(<ClaimDocumentList claimId={7} documents={docs} documentsDeletedAt={deletedAt} tr={tr} />)

describe('ClaimDocumentList', () => {
  it('nothing is loaded just by opening the page', () => {
    const { container } = show([doc(), doc({ id: 2, filename: 'scan.png', media_type: 'image/png' })])
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('a PDF is a link to the admin proxy that opens in a new tab with noopener', () => {
    show([doc()])
    const link = screen.getByTestId('claim-document-open')
    expect(link.getAttribute('href')).toBe('/api/admin/claim-requests/7/documents/1')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('an image is loaded only after the click and can be hidden again', () => {
    const { container } = show([doc({ id: 2, filename: 'scan.png', media_type: 'image/png' })])
    fireEvent.click(screen.getByTestId('claim-document-toggle'))
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/api/admin/claim-requests/7/documents/2')
    expect(container.querySelector('img')!.getAttribute('alt')).toBe('scan.png')
    fireEvent.click(screen.getByTestId('claim-document-toggle'))
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows the view counter and that every view is logged', () => {
    show([doc({ view_count: 3 })])
    expect(screen.getByTestId('claim-document')).toHaveTextContent('20 KB · 3 views')
    expect(screen.getByText(tr.claims_doc_hint)).toBeInTheDocument()
  })

  it('a deleted document has no link and no toggle, only the deletion date', () => {
    show([doc({ deleted_at: '2027-01-20T00:00:00Z' }), doc({ id: 2, media_type: 'image/jpeg', deleted_at: '2027-01-20T00:00:00Z' })])
    expect(screen.queryByTestId('claim-document-open')).toBeNull()
    expect(screen.queryByTestId('claim-document-toggle')).toBeNull()
    expect(within(screen.getAllByTestId('claim-document')[0]).getByText('deleted 2027-01-20')).toBeInTheDocument()
  })

  it('shows when all documents were deleted by the retention job (AC 38)', () => {
    show([doc({ deleted_at: '2027-01-20T00:00:00Z' })], '2027-01-20T00:00:00Z')
    expect(screen.getByText('Documents deleted on 2027-01-20.')).toBeInTheDocument()
  })

  it('no documents', () => {
    show([])
    expect(screen.getByText(tr.claims_doc_none)).toBeInTheDocument()
  })
})
