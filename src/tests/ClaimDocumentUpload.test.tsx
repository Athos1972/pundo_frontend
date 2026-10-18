// F5970 AC 19: browser-side pre-check (type, size, count), removal, privacy notice
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClaimDocumentUpload, checkDocument } from '@/components/shop-admin/claim/ClaimDocumentUpload'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'

const MB = 1024 * 1024
const file = (name: string, type: string, size = 1000) => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('checkDocument', () => {
  it.each([
    ['scan.pdf', 'application/pdf', 1000, true],
    ['photo.JPG', 'image/jpeg', 1000, true],
    ['photo.jpeg', 'image/jpeg', 1000, true],
    ['logo.png', 'image/png', 1000, true],
    ['no-mime.pdf', '', 1000, true], // some browsers send no MIME type
    ['evil.exe', 'application/octet-stream', 1000, false],
    ['evil.pdf.exe', 'application/pdf', 1000, false],
    ['doc.pdf', 'text/html', 1000, false],
    ['anim.gif', 'image/gif', 1000, false],
  ])('%s (%s) -> ok=%s', (name, type, size, ok) => {
    expect(checkDocument({ name, type, size }, 10 * MB).ok).toBe(ok)
  })

  it('rejects files over the limit, accepts exactly the limit', () => {
    expect(checkDocument({ name: 'a.pdf', type: 'application/pdf', size: 10 * MB + 1 }, 10 * MB)).toEqual({ ok: false, reason: 'size' })
    expect(checkDocument({ name: 'a.pdf', type: 'application/pdf', size: 10 * MB }, 10 * MB).ok).toBe(true)
  })
})

function setup(initial: File[] = [], lang: 'en' | 'de' | 'ar' = 'en') {
  const onChange = vi.fn()
  const tr = tShopAdminClaim(lang)
  const view = render(<ClaimDocumentUpload tr={tr} lang={lang} files={initial} onChange={onChange} maxFiles={3} maxBytes={10 * MB} />)
  const input = screen.getByTestId('claim-file-input') as HTMLInputElement
  const pick = (...files: File[]) => fireEvent.change(input, { target: { files } })
  return { onChange, tr, pick, ...view }
}

describe('ClaimDocumentUpload', () => {
  it('adds valid files', () => {
    const { onChange, pick } = setup()
    const a = file('a.pdf', 'application/pdf')
    pick(a)
    expect(onChange).toHaveBeenCalledWith([a])
  })

  it('refuses a wrong type with the translated message and the file name', () => {
    const { onChange, pick, tr } = setup()
    pick(file('evil.exe', 'application/octet-stream'))
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_upload_err_type.replace('{name}', 'evil.exe'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('refuses an oversized file with the limit in the message', () => {
    const { pick } = setup()
    pick(file('big.pdf', 'application/pdf', 11 * MB))
    expect(screen.getByRole('alert')).toHaveTextContent('big.pdf')
    expect(screen.getByRole('alert')).toHaveTextContent('10 MB')
  })

  it('keeps the good files and reports the bad one in a mixed selection', () => {
    const { onChange, pick } = setup()
    const good = file('ok.png', 'image/png')
    pick(good, file('bad.gif', 'image/gif'))
    expect(onChange).toHaveBeenCalledWith([good])
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('allows at most 3 files and explains why', () => {
    const existing = [file('1.pdf', 'application/pdf'), file('2.pdf', 'application/pdf'), file('3.pdf', 'application/pdf')]
    const { onChange, pick, tr } = setup(existing)
    pick(file('4.pdf', 'application/pdf'))
    expect(onChange).toHaveBeenCalledWith(existing)
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_upload_err_count.replace('{max}', '3'))
  })

  it('removes a file before sending', () => {
    const a = file('a.pdf', 'application/pdf')
    const b = file('b.pdf', 'application/pdf')
    const { onChange } = setup([a, b])
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    expect(onChange).toHaveBeenCalledWith([b])
  })

  it('tells what happens with the files and links to the privacy section with the language prefix', () => {
    setup([], 'de')
    expect(screen.getByText(/Nur Pundo-Administratoren sehen diese Dateien/)).toBeInTheDocument()
    expect(screen.getByText(/90 Tage/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Datenschutzerklärung' })
    expect(link.getAttribute('href')).toBe('/de/legal/privacy#shop-claim')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('restricts the file picker to the allowed types', () => {
    setup()
    expect((screen.getByTestId('claim-file-input') as HTMLInputElement).accept).toContain('application/pdf')
  })
})
