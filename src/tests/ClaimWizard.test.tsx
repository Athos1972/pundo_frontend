// F5970 AC 4, 6, 10, 11, 18, 19: the claim application wizard
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClaimWizard } from '@/components/shop-admin/claim/ClaimWizard'
import { ClaimApiError } from '@/lib/shop-admin-claim-client'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import type { ClaimShopInfo } from '@/types/shop-admin'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock('@/components/ui/TurnstileWidget', () => ({
  TurnstileWidget: ({ onToken }: { onToken: (t: string) => void }) => {
    // the widget issues a token right away in tests
    queueMicrotask(() => onToken('turnstile-ok'))
    return <div data-testid="turnstile" />
  },
}))
vi.mock('@/lib/shop-admin-claim-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/shop-admin-claim-client')>()),
  createClaimRequest: vi.fn(),
}))
vi.mock('@/lib/onboarding/draftStorage', () => ({ loadDraft: vi.fn(() => null) }))

import * as client from '@/lib/shop-admin-claim-client'
import * as draft from '@/lib/onboarding/draftStorage'

const tr = tShopAdminClaim('en')
const create = vi.mocked(client.createClaimRequest)

const SHOP = { slug: 'cafe-omega', name: 'Cafe Omega', address: 'Main St 1', city: 'Limassol', website_host: 'beispiel.cy', logo_url: null }
const LIMITS = { max_files: 3, max_file_bytes: 10 * 1024 * 1024, message_max_chars: 1000 }
const claimInfo = (over: Partial<ClaimShopInfo> = {}): ClaimShopInfo => ({
  shop: SHOP, is_claimed: false, mode: 'claim', document_upload_available: true, limits: LIMITS, viewer: null,
  methods: [
    { method: 'email_domain', requires_domain: 'beispiel.cy' },
    { method: 'shop_email_code', masked_email: 'i***@beispiel.cy' },
    { method: 'phone_callback', masked_phone: '+357 ** *** 456' },
    { method: 'document' },
  ],
  ...over,
})
const disputeInfo = (over: Partial<ClaimShopInfo> = {}) => claimInfo({ is_claimed: true, mode: 'dispute', methods: [{ method: 'document' }], ...over })

const pdf = () => new File(['%PDF-1.4'], 'schein.pdf', { type: 'application/pdf' })

function fillAccount(email = 'boss@beispiel.cy') {
  fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Ioannis' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'S3cure-pass!' } })
  fireEvent.click(screen.getByRole('button', { name: tr.claim_continue }))
}
function confirmOwner() {
  fireEvent.click(screen.getByTestId('claim-owner-confirm'))
  fireEvent.click(screen.getByRole('button', { name: tr.claim_continue }))
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(draft.loadDraft).mockReturnValue(null)
})

describe('step 1: confirm', () => {
  it('shows the read-only shop data and blocks until the owner checkbox is ticked', () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    expect(screen.getByTestId('claim-shop-name')).toHaveTextContent('Cafe Omega')
    expect(screen.getByText(/Main St 1, Limassol/)).toBeInTheDocument()
    expect(screen.getByText('beispiel.cy')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: tr.claim_continue }))
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_owner_confirm_required)
    expect(screen.queryByTestId('claim-account-step')).toBeNull()
  })

  it('shows the dispute intro for a claimed shop', () => {
    render(<ClaimWizard lang="en" info={disputeInfo()} />)
    expect(screen.getByText(tr.claim_intro_dispute)).toBeInTheDocument()
  })
})

describe('account step', () => {
  it('validates before it continues and never shows a captcha here', () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    confirmOwner()
    expect(screen.getByTestId('claim-account-step')).toBeInTheDocument()
    expect(screen.queryByTestId('turnstile')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: tr.claim_continue }))
    expect(screen.getByTestId('claim-account-step')).toBeInTheDocument() // still here
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })

  it('prefills the e-mail from the onboarding draft (AR21)', () => {
    vi.mocked(draft.loadDraft).mockReturnValue({ contact: { businessEmail: 'info@beispiel.cy' } } as never)
    render(<ClaimWizard lang="en" info={claimInfo()} from="onboarding" />)
    confirmOwner()
    return waitFor(() => expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('info@beispiel.cy'))
  })

  it('does not read the draft when the user did not come from the wizard', () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    expect(draft.loadDraft).not.toHaveBeenCalled()
  })
})

describe('method step (claim mode)', () => {
  it('offers the domain method only for a matching e-mail (AC 6)', () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    confirmOwner()
    fillAccount('me@gmail.com')
    expect(screen.queryByText(tr.claim_method_email_domain)).toBeNull()
    expect(screen.getByText(tr.claim_method_shop_email_code)).toBeInTheDocument()
  })

  it('submits the domain proof with the account data, the captcha token and the language, then goes to the status page without a token in the URL', async () => {
    create.mockResolvedValue({ claim_request_id: 7, access_token: 'SECRET-TOKEN', status: 'open', existing: false, next_step: 'verify_email' })
    render(<ClaimWizard lang="de" info={claimInfo()} />)
    // German UI
    fireEvent.click(screen.getByTestId('claim-owner-confirm'))
    fireEvent.click(screen.getByRole('button', { name: tShopAdminClaim('de').claim_continue }))
    fireEvent.change(screen.getByLabelText(/Dein Name/), { target: { value: 'Ioannis' } })
    fireEvent.change(screen.getByLabelText(/^E-Mail/), { target: { value: 'boss@beispiel.cy' } })
    fireEvent.change(screen.getByLabelText(/Passwort/), { target: { value: 'S3cure-pass!' } })
    fireEvent.click(screen.getByRole('button', { name: tShopAdminClaim('de').claim_continue }))
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tShopAdminClaim('de').claim_method_email_domain) }))
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const form = create.mock.calls[0][0] as FormData
    expect(Object.fromEntries(form.entries())).toEqual({
      shop_slug: 'cafe-omega', source: 'shop_page', proof_method: 'email_domain', owner_confirmed: 'true', lang: 'de',
      turnstile_token: 'turnstile-ok', name: 'Ioannis', email: 'boss@beispiel.cy', password: 'S3cure-pass!',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/claim/status?id=7'))
    expect(push.mock.calls[0][0]).not.toContain('SECRET')
    expect(sessionStorage.getItem('claim:7')).toBe('SECRET-TOKEN')
  })

  it('marks an onboarding origin and an existing application', async () => {
    create.mockResolvedValue({ claim_request_id: 9, access_token: 't', status: 'open', existing: true, next_step: 'await_review' })
    render(<ClaimWizard lang="en" info={claimInfo()} from="onboarding" />)
    confirmOwner()
    fillAccount('x@gmail.com')
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr.claim_method_phone_callback) }))
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/claim/status?id=9&existing=1'))
    expect((create.mock.calls[0][0] as FormData).get('source')).toBe('onboarding')
  })

  it('cannot submit without a method', async () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    confirmOwner()
    fillAccount('x@gmail.com')
    await waitFor(() => expect(screen.getByTestId('turnstile')).toBeInTheDocument())
    expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(true)
  })

  it('wrong password: back to the account step with the translated message, fresh captcha needed', async () => {
    create.mockRejectedValue(new ClaimApiError(401, 'invalid_credentials'))
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    confirmOwner()
    fillAccount('x@gmail.com')
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr.claim_method_phone_callback) }))
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))
    await waitFor(() => expect(screen.getByTestId('claim-account-step')).toBeInTheDocument())
    expect(screen.getByText(tr.claim_err_credentials)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('other errors stay on the method step with a translated message', async () => {
    create.mockRejectedValue(new ClaimApiError(429, 'claim_cooldown', { until: '2026-12-01T00:00:00Z' }))
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    confirmOwner()
    fillAccount('x@gmail.com')
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr.claim_method_phone_callback) }))
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))
    await waitFor(() => expect(screen.getByText(/You can apply again after/)).toBeInTheDocument())
    expect(screen.getByTestId('claim-step-method')).toBeInTheDocument()
  })
})

describe('dispute mode (AC 18/19)', () => {
  function toMethodStep() {
    render(<ClaimWizard lang="en" info={disputeInfo()} />)
    confirmOwner()
    fillAccount('owner@gmail.com')
  }

  it('offers only the document upload, no method picker, plus message and call-back acknowledgement', () => {
    toMethodStep()
    expect(screen.queryByTestId('claim-method-picker')).toBeNull()
    expect(screen.getByTestId('claim-document-upload')).toBeInTheDocument()
    expect(screen.getByLabelText(tr.claim_message_label_dispute)).toBeInTheDocument()
    expect(screen.getByTestId('claim-callback-ack')).toBeInTheDocument()
  })

  it('needs a file and the acknowledgement before it can be sent', async () => {
    toMethodStep()
    await waitFor(() => expect(screen.getByTestId('turnstile')).toBeInTheDocument())
    expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('claim-callback-ack'))
    expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(true) // still no document
    fireEvent.change(screen.getByTestId('claim-file-input'), { target: { files: [pdf()] } })
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
  })

  it('sends the files, the message and callback_ack', async () => {
    create.mockResolvedValue({ claim_request_id: 3, access_token: 't', status: 'open', existing: false, next_step: 'await_review' })
    toMethodStep()
    fireEvent.change(screen.getByLabelText(tr.claim_message_label_dispute), { target: { value: 'Somebody else registered my shop' } })
    fireEvent.click(screen.getByTestId('claim-callback-ack'))
    fireEvent.change(screen.getByTestId('claim-file-input'), { target: { files: [pdf()] } })
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))
    await waitFor(() => expect(create).toHaveBeenCalled())
    const form = create.mock.calls[0][0] as FormData
    expect(form.get('proof_method')).toBe('document')
    expect(form.get('callback_ack')).toBe('true')
    expect(form.get('message')).toBe('Somebody else registered my shop')
    expect((form.getAll('files')[0] as File).name).toBe('schein.pdf')
  })

  it('refuses a wrong file type in the browser with the translated message (AC 19)', () => {
    toMethodStep()
    fireEvent.change(screen.getByTestId('claim-file-input'), { target: { files: [new File(['x'], 'virus.exe', { type: 'application/x-msdownload' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent(tr.claim_upload_err_type.replace('{name}', 'virus.exe'))
  })
})

describe('logged-in visitor', () => {
  const viewer = { has_shop: false, status: 'pre_signup', email: 'me@beispiel.cy' }

  it('skips the account step (two steps) and does not send credentials', async () => {
    create.mockResolvedValue({ claim_request_id: 5, access_token: 't', status: 'open', existing: false, next_step: 'request_code' })
    render(<ClaimWizard lang="en" info={claimInfo({ viewer })} />)
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByText(/me@beispiel\.cy/)).toBeInTheDocument()
    confirmOwner()
    expect(screen.queryByTestId('claim-account-step')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr.claim_method_email_domain) })) // domain of the viewer e-mail matches
    await waitFor(() => expect((screen.getByTestId('claim-submit') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByTestId('claim-submit'))
    await waitFor(() => expect(create).toHaveBeenCalled())
    const form = create.mock.calls[0][0] as FormData
    expect(form.get('email')).toBeNull()
    expect(form.get('password')).toBeNull()
    expect(form.get('name')).toBeNull()
  })

  it('an account that already has a shop is stopped with the contact link and no form (AC 11)', () => {
    render(<ClaimWizard lang="en" info={claimInfo({ viewer: { ...viewer, has_shop: true } })} />)
    expect(screen.getByTestId('claim-has-shop')).toHaveTextContent(tr.claim_has_shop_title)
    expect(screen.queryByTestId('claim-owner-confirm')).toBeNull()
    expect(screen.getByRole('link', { name: tr.claim_contact_support }).getAttribute('href')).toBe('mailto:support@pundo.cy')
  })
})

describe('no proof possible', () => {
  it('upload disabled and nothing else: tells the user to contact us instead of showing a dead form', () => {
    render(<ClaimWizard lang="en" info={disputeInfo({ methods: [], document_upload_available: false })} />)
    expect(screen.getByTestId('claim-no-method')).toHaveTextContent(tr.claim_upload_disabled_title)
    expect(screen.queryByTestId('claim-owner-confirm')).toBeNull()
  })
})

describe('RTL', () => {
  it.each(['ar', 'he'] as const)('%s wizard is rendered right-to-left', (lang) => {
    render(<ClaimWizard lang={lang} info={claimInfo()} />)
    expect(screen.getByTestId('claim-wizard').getAttribute('dir')).toBe('rtl')
  })

  it('en is left-to-right', () => {
    render(<ClaimWizard lang="en" info={claimInfo()} />)
    expect(screen.getByTestId('claim-wizard').getAttribute('dir')).toBe('ltr')
  })
})
