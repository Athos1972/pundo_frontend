import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startStatusPolling } from '@/components/shop-admin/useImportStatusPolling'
import type { ImportStatus } from '@/types/shop-admin'

describe('startStatusPolling', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const st = (n: number): ImportStatus => ({ last_sync: String(n) })

  it('polls with growing delays and repeats the last delay', async () => {
    const fetchStatus = vi.fn().mockResolvedValue(st(0))
    const cancel = startStatusPolling({
      fetchStatus, isDone: () => false, onStatus: vi.fn(), onTimeout: vi.fn(),
      delaysMs: [100, 200, 400], maxTotalMs: 100000,
    })
    await vi.advanceTimersByTimeAsync(99)
    expect(fetchStatus).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchStatus).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(200)
    expect(fetchStatus).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(400)
    expect(fetchStatus).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(400)
    expect(fetchStatus).toHaveBeenCalledTimes(4)
    cancel()
  })

  it('stops as soon as isDone is true and leaves no timer', async () => {
    const onStatus = vi.fn()
    const onTimeout = vi.fn()
    const fetchStatus = vi.fn().mockResolvedValueOnce(st(0)).mockResolvedValueOnce(st(1))
    startStatusPolling({
      fetchStatus, isDone: (s) => s.last_sync === '1', onStatus, onTimeout, delaysMs: [100], maxTotalMs: 10000,
    })
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchStatus).toHaveBeenCalledTimes(2)
    expect(onStatus).toHaveBeenCalledTimes(2)
    expect(onTimeout).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('calls onTimeout once after the upper bound', async () => {
    const onTimeout = vi.fn()
    const fetchStatus = vi.fn().mockResolvedValue(st(0))
    startStatusPolling({
      fetchStatus, isDone: () => false, onStatus: vi.fn(), onTimeout, delaysMs: [100], maxTotalMs: 500,
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(fetchStatus).toHaveBeenCalledTimes(5)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancel stops further fetches and blocks onStatus of an in-flight fetch', async () => {
    const onStatus = vi.fn()
    let resolveFetch: (s: ImportStatus) => void = () => {}
    const fetchStatus = vi.fn().mockImplementation(() => new Promise<ImportStatus>((r) => { resolveFetch = r }))
    const cancel = startStatusPolling({
      fetchStatus, isDone: () => false, onStatus, onTimeout: vi.fn(), delaysMs: [100], maxTotalMs: 10000,
    })
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchStatus).toHaveBeenCalledTimes(1)
    cancel()
    resolveFetch(st(1))
    await vi.advanceTimersByTimeAsync(5000)
    expect(onStatus).not.toHaveBeenCalled()
    expect(fetchStatus).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancel before the first tick clears the timer', () => {
    const cancel = startStatusPolling({
      fetchStatus: vi.fn(), isDone: () => false, onStatus: vi.fn(), onTimeout: vi.fn(),
    })
    expect(vi.getTimerCount()).toBe(1)
    cancel()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a failing fetch does not stop the polling', async () => {
    const fetchStatus = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(st(1))
    const onStatus = vi.fn()
    startStatusPolling({
      fetchStatus, isDone: () => true, onStatus, onTimeout: vi.fn(), delaysMs: [100], maxTotalMs: 10000,
    })
    await vi.advanceTimersByTimeAsync(300)
    expect(onStatus).toHaveBeenCalledTimes(1)
  })
})
