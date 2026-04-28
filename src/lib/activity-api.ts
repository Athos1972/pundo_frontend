// =============================================================================
// src/lib/activity-api.ts
//
// Fetch wrapper for GET /api/v1/activity — follows the pattern in api.ts.
// Works on both server (SSR) and client.
// =============================================================================

import type { ActivityResponse } from '@/types/activity'

const BASE =
  typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1')

export interface GetActivityParams {
  limit?: number
  since?: string | null
}

/**
 * Fetch activity events from the backend.
 * Timeout is enforced via AbortSignal.timeout (caller may also pass a signal).
 */
export async function getActivity(
  params: GetActivityParams,
  lang: string,
  signal?: AbortSignal
): Promise<ActivityResponse> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params.limit ?? 20))
  if (params.since) qs.set('since', params.since)

  const url = `${BASE}/activity?${qs.toString()}`

  const res = await fetch(url, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`activity API ${res.status}`)
  return res.json() as Promise<ActivityResponse>
}
