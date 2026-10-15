import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportPreview } from '@/components/shop-admin/useImportPreview'
import type { ImportPreview, ImportPreviewRow } from '@/types/shop-admin'

const COUNTS = { new: 2, updated: 0, unchanged: 0, error: 0, possible_duplicate: 0, deactivate: 0 }

function row(n: number, extra: Partial<ImportPreviewRow> = {}): ImportPreviewRow {
  return { row: n, status: 'new', name: `Item ${n}`, language: 'en', changes: [], candidates: [], errors: [], hints: [], ...extra }
}

function pv(extra: Partial<ImportPreview> = {}): ImportPreview {
  return {
    id: 'p-1', status: 'ready', full_list: false, default_lang: 'en', filename: 'l.csv', row_count: 2,
    expires_at: '2026-10-15T20:30:00Z', expired: false, can_apply: true, counts: COUNTS, rows: [row(2), row(3)],
    rows_total: 2, deactivations: [], deactivations_total: 0, ...extra,
  }
}

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>
let calls: { url: string; init?: RequestInit }[]
let handler: Handler

beforeEach(() => {
  vi.useFakeTimers()
  calls = []
  handler = () => json(500)
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return handler(url, init)
  }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const file = new File(['name\nX\n'], 'l.csv', { type: 'text/csv' })
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

function routes(map: { post?: Response; get?: (Response | (() => Response))[]; apply?: Response; del?: Response }) {
  const gets = [...(map.get ?? [])]
  handler = (url, init) => {
    const method = init?.method ?? 'GET'
    if (method === 'POST' && url.endsWith('/previews')) return map.post ?? json(202, { id: 'p-1', status: 'processing', expires_at: 'x', row_count: 2 })
    if (method === 'POST' && url.endsWith('/apply')) return map.apply ?? json(202, { id: 'p-1', status: 'applying' })
    if (method === 'DELETE') return map.del ?? new Response(null, { status: 204 })
    const next = gets.length > 1 ? gets.shift()! : gets[0]
    return typeof next === 'function' ? next() : next.clone()
  }
}

describe('useImportPreview — create', () => {
  it('uploads file + full_list + UI language, polls (processing -> ready) and shows the first page of rows', async () => {
    routes({ get: [json(200, pv({ status: 'processing', rows: [], counts: null, progress: { phase: 'match', done: 1, total: 2 } })), json(200, pv())] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, true, 'el') })
    expect(result.current.phase).toBe('checking')

    const post = calls[0]
    expect(post.url).toBe('/api/shop-admin/import/previews')
    const form = post.init!.body as FormData
    expect(form.get('file')).toBeInstanceOf(File)
    expect(form.get('full_list')).toBe('true')
    expect(form.get('default_lang')).toBe('el')

    await flush(1000)
    expect(result.current.phase).toBe('checking')
    expect(result.current.preview?.progress).toEqual({ phase: 'match', done: 1, total: 2 })
    await flush(2000)
    expect(result.current.phase).toBe('preview')
    expect(result.current.preview?.rows).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0) // polling stopped when ready
  })

  it('unchecked box is sent as false', async () => {
    routes({ get: [json(200, pv())] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    expect((calls[0].init!.body as FormData).get('full_list')).toBe('false')
  })

  it.each([
    [400, { detail: { code: 'missing_name_column' } }, 'missing_name_column', undefined],
    [400, { detail: { code: 'too_many_rows', limit: 100 } }, 'too_many_rows', 100],
    [413, { detail: { code: 'file_too_large' } }, 'file_too_large', undefined],
    [429, { detail: { code: 'preview_in_progress' } }, 'preview_in_progress', undefined],
    [500, { detail: 'Internal' }, 'unknown', undefined],
  ])('upload error %s -> back to idle with code %s', async (status, body, code, limit) => {
    routes({ post: json(status, body) })
    const { result } = renderHook(() => useImportPreview())
    let ok = true
    await act(async () => { ok = await result.current.create(file, false, 'en') })
    expect(ok).toBe(false)
    expect(result.current.phase).toBe('idle')
    expect(result.current.error?.code).toBe(code)
    expect(result.current.error?.limit).toBe(limit)
  })

  it('network error while uploading', async () => {
    handler = () => { throw new Error('offline') }
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    expect(result.current.phase).toBe('idle')
    expect(result.current.error?.code).toBe('network')
  })

  it('a failed analysis ends in phase failed with the server error code', async () => {
    routes({ get: [json(200, pv({ status: 'failed', rows: [], counts: null, error_code: 'job_lost' }))] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    await flush(1000)
    expect(result.current.phase).toBe('failed')
    expect(result.current.error?.code).toBe('job_lost')
  })

  it('gives up polling after 5 minutes and says so (timedOut)', async () => {
    routes({ get: [json(200, pv({ status: 'processing', rows: [], counts: null }))] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    await flush(6 * 60 * 1000)
    expect(result.current.timedOut).toBe(true)
    expect(result.current.phase).toBe('checking')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a new upload resets the previous error and preview', async () => {
    routes({ post: json(400, { detail: { code: 'empty_file' } }) })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    expect(result.current.error?.code).toBe('empty_file')
    routes({ get: [json(200, pv())] })
    await act(async () => { await result.current.create(file, false, 'en') })
    expect(result.current.error).toBeNull()
  })
})

describe('useImportPreview — apply', () => {
  async function ready(onApplied?: (p: ImportPreview) => void, applyResponse?: Response, applied?: ImportPreview) {
    routes({
      get: [json(200, pv()), applied ? json(200, applied) : json(200, pv({ status: 'applying' }))],
      apply: applyResponse,
    })
    const hook = renderHook(() => useImportPreview({ onApplied }))
    await act(async () => { await hook.result.current.create(file, false, 'en') })
    await flush(1000)
    expect(hook.result.current.phase).toBe('preview')
    return hook
  }

  it('posts the decisions, polls applying -> applied and reports the result once', async () => {
    const onApplied = vi.fn()
    const result = { created: 2, updated: 0, unchanged: 0, deactivated: 0, linked_existing: 1, image_download_pending: 0, translation_queued: 2, row_count: 2, hints: {} }
    routes({
      get: [json(200, pv()), json(200, pv({ status: 'applying', progress: { phase: 'apply', done: 1, total: 2 } })), json(200, pv({ status: 'applied', rows: [], result }))],
    })
    const { result: hook } = renderHook(() => useImportPreview({ onApplied }))
    await act(async () => { await hook.current.create(file, false, 'en') })
    await flush(1000)
    await act(async () => { await hook.current.apply([{ row: 2, action: 'use_existing', item_id: 99 }]) })
    const applyCall = calls.find((c) => c.url.endsWith('/apply'))!
    expect(JSON.parse(applyCall.init!.body as string)).toEqual({ decisions: [{ row: 2, action: 'use_existing', item_id: 99 }] })
    expect(hook.current.phase).toBe('applying')

    await flush(1000)
    expect(hook.current.phase).toBe('applying')
    expect(hook.current.preview?.rows).toHaveLength(2) // rows stay on screen while the job runs (those responses carry none)
    await flush(2000)
    expect(hook.current.phase).toBe('result')
    expect(hook.current.preview?.result?.linked_existing).toBe(1)
    expect(onApplied).toHaveBeenCalledTimes(1)
    expect(onApplied.mock.calls[0][0].result.created).toBe(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('apply that ends failed (stale data) -> phase failed with preview_stale', async () => {
    const { result } = await ready(undefined, undefined, pv({ status: 'failed', rows: [], error_code: 'preview_stale' }))
    await act(async () => { await result.current.apply([]) })
    await flush(1000)
    await flush(1000)
    await flush(2000)
    expect(result.current.phase).toBe('failed')
    expect(result.current.error?.code).toBe('preview_stale')
  })

  it.each([
    [410, { detail: { code: 'preview_expired' } }, 'preview_expired'],
    [409, { detail: { code: 'preview_has_errors' } }, 'preview_has_errors'],
    [409, { detail: { code: 'preview_already_applied' } }, 'preview_already_applied'],
    [422, { detail: { code: 'decision_conflict', rows: [2, 3] } }, 'decision_conflict'],
    [422, { detail: { code: 'invalid_decision', rows: [2] } }, 'invalid_decision'],
  ])('apply error %s keeps the preview on screen with code %s', async (status, body, code) => {
    const { result } = await ready(undefined, json(status, body))
    let ok = true
    await act(async () => { ok = await result.current.apply([]) })
    expect(ok).toBe(false)
    expect(result.current.phase).toBe('preview')
    expect(result.current.error?.code).toBe(code)
  })

  it('apply conflict carries the offending rows', async () => {
    const { result } = await ready(undefined, json(422, { detail: { code: 'decision_conflict', rows: [2, 3] } }))
    await act(async () => { await result.current.apply([]) })
    expect(result.current.error?.rows).toEqual([2, 3])
  })

  it('network error on apply', async () => {
    const { result } = await ready()
    handler = () => { throw new Error('offline') }
    await act(async () => { await result.current.apply([]) })
    expect(result.current.error?.code).toBe('network')
    expect(result.current.phase).toBe('preview')
  })

  it('apply without a preview does nothing', async () => {
    const { result } = renderHook(() => useImportPreview())
    let ok = true
    await act(async () => { ok = await result.current.apply([]) })
    expect(ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})

describe('useImportPreview — cancel, filter, paging, cleanup', () => {
  it('cancel deletes the preview, stops polling and returns to an empty form (AK 2)', async () => {
    routes({ get: [json(200, pv({ status: 'processing', rows: [], counts: null }))] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    await act(async () => { await result.current.cancel() })
    expect(calls.some((c) => c.init?.method === 'DELETE' && c.url.endsWith('/previews/p-1'))).toBe(true)
    expect(result.current.phase).toBe('idle')
    expect(result.current.preview).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    const before = calls.length
    await flush(10_000)
    expect(calls.length).toBe(before)
  })

  it('cancel still resets when the DELETE fails (nothing was saved either way)', async () => {
    routes({ get: [json(200, pv())], del: json(500) })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    await flush(1000)
    handler = () => { throw new Error('offline') }
    await act(async () => { await result.current.cancel() })
    expect(result.current.phase).toBe('idle')
  })

  it('setFilter loads the first page of that status; loadMore appends the next page with the right offset', async () => {
    routes({ get: [json(200, pv({ rows_total: 150, rows: Array.from({ length: 100 }, (_, i) => row(i + 2)) }))] })
    const { result } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    await flush(1000)
    expect(result.current.preview?.rows).toHaveLength(100)

    handler = () => json(200, pv({ rows_total: 150, rows: Array.from({ length: 50 }, (_, i) => row(i + 102)) }))
    await act(async () => { await result.current.loadMore() })
    const more = calls[calls.length - 1].url
    expect(more).toContain('offset=100')
    expect(more).toContain('limit=100')
    expect(result.current.preview?.rows).toHaveLength(150)

    handler = () => json(200, pv({ rows_total: 1, rows: [row(9, { status: 'error' })] }))
    await act(async () => { await result.current.setFilter('error') })
    expect(calls[calls.length - 1].url).toContain('status=error')
    expect(calls[calls.length - 1].url).toContain('offset=0')
    expect(result.current.filter).toBe('error')
    expect(result.current.preview?.rows).toHaveLength(1)

    handler = () => json(200, pv({ rows_total: 1, rows: [row(9, { status: 'error' })] }))
    await act(async () => { await result.current.loadMore() })
    expect(calls[calls.length - 1].url).toContain('status=error') // paging keeps the filter
  })

  it('unmount stops the polling', async () => {
    routes({ get: [json(200, pv({ status: 'processing', rows: [], counts: null }))] })
    const { result, unmount } = renderHook(() => useImportPreview())
    await act(async () => { await result.current.create(file, false, 'en') })
    unmount()
    const before = calls.length
    await flush(20_000)
    expect(calls.length).toBe(before)
  })
})
