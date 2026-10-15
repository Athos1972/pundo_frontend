'use client'
// Only imports from React, shop-admin types and sibling files (Clean Boundary)

import { useCallback, useEffect, useRef, useState } from 'react'
import { startStatusPolling } from './useImportStatusPolling'
import type {
  ImportApplyDecision,
  ImportPreview,
  ImportPreviewCreated,
  ImportRowStatus,
} from '@/types/shop-admin'

export type ImportFlowPhase = 'idle' | 'checking' | 'preview' | 'applying' | 'result' | 'failed'

/** Machine-readable problem; the component turns it into a translated text. */
export interface ImportFlowError {
  /** server `detail.code`, or `preview_expired` / `network` / `unknown` */
  code: string
  limit?: number
  rows?: number[]
}

export const PREVIEW_PAGE_SIZE = 100
export const PREVIEW_POLL_DELAYS_MS = [1000, 2000, 3000]
export const PREVIEW_POLL_MAX_TOTAL_MS = 5 * 60 * 1000
const BASE = '/api/shop-admin/import/previews'

async function readError(res: Response): Promise<ImportFlowError> {
  const body = (await res.json().catch(() => null)) as
    | { detail?: { code?: string; limit?: number; rows?: number[] } | string }
    | null
  const detail = body?.detail
  if (detail && typeof detail === 'object' && detail.code) {
    return { code: detail.code, limit: detail.limit, rows: detail.rows }
  }
  return { code: 'unknown' }
}

function pageUrl(id: string, status: ImportRowStatus | null, offset: number): string {
  const q = new URLSearchParams({ limit: String(PREVIEW_PAGE_SIZE), offset: String(offset) })
  if (status) q.set('status', status)
  return `${BASE}/${id}?${q.toString()}`
}

const TERMINAL: ReadonlyArray<ImportPreview['status']> = ['ready', 'failed', 'applied']

/**
 * State machine of the catalog import: `idle -> checking -> preview -> applying -> result` (or `failed`).
 * `create` uploads the file (nothing is saved), polls until the analysis is `ready`; `apply` writes exactly
 * that preview, polls until `applied`; `cancel` discards it.
 */
export function useImportPreview(options: { onApplied?: (preview: ImportPreview) => void } = {}) {
  const onAppliedRef = useRef(options.onApplied)
  useEffect(() => {
    onAppliedRef.current = options.onApplied
  })
  const [phase, setPhase] = useState<ImportFlowPhase>('idle')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<ImportFlowError | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [filter, setFilterState] = useState<ImportRowStatus | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const cancelPoll = useRef<(() => void) | null>(null)
  const previewId = useRef<string | null>(null)
  const filterRef = useRef<ImportRowStatus | null>(null)

  const stopPolling = useCallback(() => {
    cancelPoll.current?.()
    cancelPoll.current = null
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const poll = useCallback(
    (id: string, mode: 'checking' | 'applying') => {
      stopPolling()
      setTimedOut(false)
      cancelPoll.current = startStatusPolling<ImportPreview>({
        fetchStatus: async () => {
          const res = await fetch(pageUrl(id, mode === 'checking' ? filterRef.current : null, 0))
          return res.ok ? ((await res.json()) as ImportPreview) : null
        },
        isDone: (p) => TERMINAL.includes(p.status),
        onStatus: (p) => {
          // keep the rows already on screen while a job is running (those responses carry none)
          setPreview((prev) => (p.status === 'applying' && prev ? { ...p, rows: prev.rows, rows_total: prev.rows_total } : p))
          if (p.status === 'ready') setPhase('preview')
          else if (p.status === 'applied') {
            setPhase('result')
            onAppliedRef.current?.(p)
          }
          else if (p.status === 'failed') {
            setError({ code: p.error_code ?? 'preview_failed' })
            setPhase('failed')
          }
        },
        onTimeout: () => setTimedOut(true),
        delaysMs: PREVIEW_POLL_DELAYS_MS,
        maxTotalMs: PREVIEW_POLL_MAX_TOTAL_MS,
      })
    },
    [stopPolling],
  )

  const reset = useCallback(() => {
    stopPolling()
    previewId.current = null
    filterRef.current = null
    setPreview(null)
    setError(null)
    setTimedOut(false)
    setFilterState(null)
    setPhase('idle')
  }, [stopPolling])

  /** Upload a file. `lang` = UI language: names without a `language` column are stored in it. */
  const create = useCallback(
    async (file: File, fullList: boolean, lang: string) => {
      stopPolling()
      setError(null)
      setPreview(null)
      setFilterState(null)
      filterRef.current = null
      setPhase('checking')
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('full_list', fullList ? 'true' : 'false')
        form.append('default_lang', lang)
        const res = await fetch(BASE, { method: 'POST', body: form })
        if (!res.ok) {
          setError(await readError(res))
          setPhase('idle')
          return false
        }
        const created = (await res.json()) as ImportPreviewCreated
        previewId.current = created.id
        poll(created.id, 'checking')
        return true
      } catch {
        setError({ code: 'network' })
        setPhase('idle')
        return false
      }
    },
    [poll, stopPolling],
  )

  const apply = useCallback(
    async (decisions: ImportApplyDecision[]) => {
      const id = previewId.current
      if (!id) return false
      setError(null)
      try {
        const res = await fetch(`${BASE}/${id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisions }),
        })
        if (!res.ok) {
          const err = await readError(res)
          setError(res.status === 410 ? { code: 'preview_expired' } : err)
          return false
        }
        setPhase('applying')
        poll(id, 'applying')
        return true
      } catch {
        setError({ code: 'network' })
        return false
      }
    },
    [poll],
  )

  const cancel = useCallback(async () => {
    const id = previewId.current
    stopPolling()
    if (id) {
      try {
        await fetch(`${BASE}/${id}`, { method: 'DELETE' })
      } catch {
        // nothing was saved either way; the preview simply expires
      }
    }
    reset()
  }, [reset, stopPolling])

  const setFilter = useCallback(async (status: ImportRowStatus | null) => {
    const id = previewId.current
    filterRef.current = status
    setFilterState(status)
    if (!id) return
    setLoadingMore(true)
    try {
      const res = await fetch(pageUrl(id, status, 0))
      if (res.ok) setPreview((await res.json()) as ImportPreview)
    } finally {
      setLoadingMore(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    const id = previewId.current
    if (!id || !preview) return
    setLoadingMore(true)
    try {
      const res = await fetch(pageUrl(id, filterRef.current, preview.rows.length))
      if (res.ok) {
        const next = (await res.json()) as ImportPreview
        setPreview((prev) => (prev ? { ...next, rows: [...prev.rows, ...next.rows] } : next))
      }
    } finally {
      setLoadingMore(false)
    }
  }, [preview])

  return { phase, preview, error, timedOut, filter, loadingMore, create, apply, cancel, reset, setFilter, loadMore }
}
