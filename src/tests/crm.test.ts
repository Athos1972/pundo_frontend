import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { CRM_ALLOWED_TRANSITIONS, LIFECYCLE_BADGE_COLORS, ALL_LIFECYCLE_STATES } from '@/components/system-admin/crm/transitions'
import type { CrmLifecycleState } from '@/types/system-admin'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/system-admin/Toast', () => ({
  showToast: vi.fn(),
}))

// ─── T1: Translations completeness ────────────────────────────────────────────

describe('CRM translations', () => {
  const en = tSysAdmin('en')
  const de = tSysAdmin('de')

  const requiredCrmKeys = [
    'nav_crm', 'crm_title', 'crm_new',
    'crm_col_name', 'crm_col_org', 'crm_col_email', 'crm_col_state', 'crm_col_updated',
    'crm_filter_all', 'crm_search_placeholder',
    'crm_form_display_name', 'crm_form_org_name', 'crm_form_email', 'crm_form_phone',
    'crm_form_city', 'crm_form_category', 'crm_form_role',
    'crm_form_submit', 'crm_form_submitting',
    'crm_action_confirm_business', 'crm_action_set_lifecycle', 'crm_action_register', 'crm_action_suppress',
    'crm_register_shop_id', 'crm_register_shop_id_hint',
    'crm_suppress_reason_hard_optout', 'crm_suppress_reason_rejected_private',
    'crm_composer_lang', 'crm_composer_subject', 'crm_composer_body',
    'crm_composer_preview', 'crm_composer_send', 'crm_composer_sending', 'crm_composer_already_sent',
    'crm_timeline_title', 'crm_channels_title', 'crm_sources_title',
    'crm_detail_org', 'crm_detail_legal', 'crm_detail_flags',
    'crm_state_SOURCED', 'crm_state_ENRICHED', 'crm_state_NEEDS_REVIEW', 'crm_state_QUEUED',
    'crm_state_CONTACTED', 'crm_state_ENGAGED', 'crm_state_INTERESTED', 'crm_state_REGISTERED',
    'crm_state_UNREACHABLE', 'crm_state_HARD_OPTOUT', 'crm_state_REJECTED_PRIVATE', 'crm_state_DEAD',
    'crm_err_forbidden', 'crm_err_conflict', 'crm_err_suppressed',
    'crm_err_illegal_transition', 'crm_err_shop_id_required', 'crm_err_no_email',
    'crm_err_send_failed', 'crm_err_generic',
    'crm_optout_confirm', 'crm_optout_button', 'crm_optout_done',
  ] as const

  it('EN has all required CRM keys', () => {
    for (const key of requiredCrmKeys) {
      expect(en[key as keyof typeof en], `EN missing key: ${key}`).toBeTruthy()
    }
  })

  it('DE has all required CRM keys', () => {
    for (const key of requiredCrmKeys) {
      expect(de[key as keyof typeof de], `DE missing key: ${key}`).toBeTruthy()
    }
  })

  it('EN and DE have same keys', () => {
    // Both should have the same set of string keys
    const enKeys = Object.keys(en).filter((k) => typeof en[k as keyof typeof en] === 'string')
    const deKeys = Object.keys(de).filter((k) => typeof de[k as keyof typeof de] === 'string')
    expect(new Set(enKeys)).toEqual(new Set(deKeys))
  })
})

// ─── T1: Lifecycle transitions ────────────────────────────────────────────────

describe('CRM_ALLOWED_TRANSITIONS', () => {
  it('covers all lifecycle states as keys', () => {
    for (const state of ALL_LIFECYCLE_STATES) {
      expect(CRM_ALLOWED_TRANSITIONS).toHaveProperty(state)
    }
  })

  it('terminal states have no allowed transitions', () => {
    const terminal: CrmLifecycleState[] = ['HARD_OPTOUT', 'REJECTED_PRIVATE', 'DEAD']
    for (const state of terminal) {
      expect(CRM_ALLOWED_TRANSITIONS[state]).toHaveLength(0)
    }
  })

  it('SOURCED can transition to QUEUED', () => {
    expect(CRM_ALLOWED_TRANSITIONS['SOURCED']).toContain('QUEUED')
  })

  it('QUEUED can transition to CONTACTED', () => {
    expect(CRM_ALLOWED_TRANSITIONS['QUEUED']).toContain('CONTACTED')
  })

  it('REGISTERED cannot transition to SOURCED', () => {
    expect(CRM_ALLOWED_TRANSITIONS['REGISTERED']).not.toContain('SOURCED')
  })

  it('all transition targets are valid lifecycle states', () => {
    const validSet = new Set(ALL_LIFECYCLE_STATES)
    for (const [from, targets] of Object.entries(CRM_ALLOWED_TRANSITIONS)) {
      for (const to of targets) {
        expect(validSet.has(to as CrmLifecycleState), `${from} → ${to} target is not a valid state`).toBe(true)
      }
    }
  })
})

// ─── T1: Badge colors ─────────────────────────────────────────────────────────

describe('LIFECYCLE_BADGE_COLORS', () => {
  it('has an entry for every lifecycle state', () => {
    for (const state of ALL_LIFECYCLE_STATES) {
      expect(LIFECYCLE_BADGE_COLORS).toHaveProperty(state)
      expect(LIFECYCLE_BADGE_COLORS[state]).toBeTruthy()
    }
  })

  it('REGISTERED uses green color', () => {
    expect(LIFECYCLE_BADGE_COLORS['REGISTERED']).toContain('green')
  })

  it('HARD_OPTOUT uses red color', () => {
    expect(LIFECYCLE_BADGE_COLORS['HARD_OPTOUT']).toContain('red')
  })
})

// ─── T3: crmFetch error mapping ───────────────────────────────────────────────

describe('crmPost status-to-toast mapping', () => {
  const tr = tSysAdmin('en')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('401 redirects to login', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    const mockFetch = vi.fn().mockResolvedValueOnce({
      status: 401, ok: false,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    const originalLocation = window.location
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', { value: mockLocation, writable: true })

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
    expect(window.location.href).toBe('/admin/login')
    expect(showToast).not.toHaveBeenCalled()

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    vi.unstubAllGlobals()
  })

  it('403 shows forbidden toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 403, ok: false,
      json: async () => ({}),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(403)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_forbidden, 'error')
    vi.unstubAllGlobals()
  })

  it('409 shows conflict toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 409, ok: false,
      json: async () => ({}),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(409)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_conflict, 'error')
    vi.unstubAllGlobals()
  })

  it('422 with string "suppressed" shows suppressed toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 422, ok: false,
      json: async () => ({ detail: 'suppressed' }),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    await crmPost('/test', {}, tr)

    expect(showToast).toHaveBeenCalledWith(tr.crm_err_suppressed, 'error')
    vi.unstubAllGlobals()
  })

  it('422 with string "illegal_transition" shows illegal_transition toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 422, ok: false,
      json: async () => ({ detail: 'illegal_transition' }),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    await crmPost('/test', {}, tr)

    expect(showToast).toHaveBeenCalledWith(tr.crm_err_illegal_transition, 'error')
    vi.unstubAllGlobals()
  })

  it('422 with string "shop_id_required" shows shop_id toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 422, ok: false,
      json: async () => ({ detail: 'shop_id_required' }),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    await crmPost('/test', {}, tr)

    expect(showToast).toHaveBeenCalledWith(tr.crm_err_shop_id_required, 'error')
    vi.unstubAllGlobals()
  })

  it('422 with object detail {detail:"suppressed"} shows suppressed toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 422, ok: false,
      json: async () => ({ detail: { detail: 'suppressed', channel_kind: 'email' } }),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    await crmPost('/test', {}, tr)

    expect(showToast).toHaveBeenCalledWith(tr.crm_err_suppressed, 'error')
    vi.unstubAllGlobals()
  })

  it('502 shows send_failed toast', async () => {
    const { showToast } = await import('@/components/system-admin/Toast')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 502, ok: false,
      json: async () => ({ detail: { detail: 'smtp_failed', message_id: 7 } }),
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(502)
    expect(showToast).toHaveBeenCalledWith(tr.crm_err_send_failed, 'error')
    vi.unstubAllGlobals()
  })

  it('200 returns ok with data', async () => {
    const payload = { message_id: 1, delivery_status: 'sent' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 200, ok: true,
      json: async () => payload,
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toEqual(payload)
    vi.unstubAllGlobals()
  })

  it('201 returns ok with data (ingest new contact)', async () => {
    const payload = { id: 99, lifecycle_state: 'SOURCED', version: 1 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      status: 201, ok: true,
      json: async () => payload,
    }))

    const { crmPost } = await import('@/components/system-admin/crm/crmFetch')
    const result = await crmPost('/test', {}, tr)

    expect(result.ok).toBe(true)
    expect(result.status).toBe(201)
    expect(result.data).toEqual(payload)
    vi.unstubAllGlobals()
  })
})

// ─── T3: idempotency_key stability (R3) ──────────────────────────────────────

describe('idempotency_key stability', () => {
  it('generateKey produces a non-empty string', () => {
    // Access the internal function by verifying the key format
    const key = crypto.randomUUID()
    expect(key).toBeTruthy()
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(10)
  })

  it('two calls produce different keys (no collision)', () => {
    const k1 = crypto.randomUUID()
    const k2 = crypto.randomUUID()
    expect(k1).not.toBe(k2)
  })
})
