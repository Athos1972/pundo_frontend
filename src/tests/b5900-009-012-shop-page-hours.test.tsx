import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const showToast = vi.fn()
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }))

import { HoursEditor } from '@/components/shop-admin/HoursEditor'
import { tAdmin } from '@/lib/shop-admin-translations'
import { buildLocalBusinessSchema } from '@/lib/structured-data'
import type { OpeningHours } from '@/types/shop-admin'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he']

function week(over: Partial<OpeningHours> = {}): OpeningHours[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).map((day) =>
    day === 0 ? { day, closed: false, open: '09:00', close: '18:00', ...over } : { day, closed: true },
  )
}

describe('searchProducts — B5900-009 AK5', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
  })
  afterEach(() => spy.mockRestore())

  it('noStore + sort=newest: cache no-store, no revalidate', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ shop_id: 5, limit: 12, sort: 'newest' }, 'en', { noStore: true })
    const [url, init] = spy.mock.calls[0] as [string, RequestInit & { next?: unknown }]
    expect(url).toContain('sort=newest')
    expect(init.cache).toBe('no-store')
    expect(init.next).toBeUndefined()
  })

  it('default call keeps revalidate and sends no sort', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ q: 'x' }, 'en')
    const [url, init] = spy.mock.calls[0] as [string, RequestInit & { next?: { revalidate: number } }]
    expect(url).not.toContain('sort=')
    expect(init.next?.revalidate).toBe(3600)
  })
})

describe('HoursEditor — B5900-012', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    showToast.mockClear()
    spy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => spy.mockRestore())

  it('blocks save for an open day without times (no request)', () => {
    render(<HoursEditor initialHours={week({ open: undefined, close: undefined })} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tAdmin('en').hours_save }))
    return waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(tAdmin('en').error_hours_incomplete, 'error')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  it('unchecking "closed" prefills times so the saved payload is complete', async () => {
    spy.mockResolvedValue(new Response('{}', { status: 200 }))
    const h = week()
    h[1] = { day: 1, closed: true }
    render(<HoursEditor initialHours={h} lang="en" />)
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(screen.getByRole('button', { name: tAdmin('en').hours_save }))
    await waitFor(() => expect(spy).toHaveBeenCalled())
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body[1]).toMatchObject({ day: 1, closed: false, open: '09:00', close: '18:00' })
  })

  it('shows the localized message on backend 422', async () => {
    spy.mockResolvedValue(new Response('{"detail":"x"}', { status: 422 }))
    render(<HoursEditor initialHours={week()} lang="de" />)
    fireEvent.click(screen.getByRole('button', { name: tAdmin('de').hours_save }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tAdmin('de').error_hours_incomplete, 'error'))
  })

  it('has the message in all 6 languages', () => {
    const en = tAdmin('en').error_hours_incomplete
    for (const l of LANGS) {
      const m = tAdmin(l).error_hours_incomplete
      expect(m).toBeTruthy()
      if (l !== 'en') expect(m).not.toBe(en)
    }
  })
})

describe('JSON-LD with broken opening_hours', () => {
  it('does not throw / emit undefined for open day without times', () => {
    const shop = { id: 1, slug: 's', name: 'S', opening_hours: { mon: { closed: false }, '0': { closed: false } } } as never
    const json = JSON.stringify(buildLocalBusinessSchema(shop, 'https://x.test'))
    expect(json).not.toContain('undefined')
  })
})
