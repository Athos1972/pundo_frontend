// B8950-016 T32: POST /api/crm/opt-out proxy. Neutral 200 for the browser in every case (no enumeration),
// but a backend failure means the opt-out was NOT recorded and must show up in the server log (never the token).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/crm/opt-out/route'

const TOKEN = 'supersecret-optout-token'

function req(body: string): NextRequest {
  return new NextRequest('http://localhost:3500/api/crm/opt-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('POST /api/crm/opt-out', () => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  const fetchMock = vi.fn()

  beforeEach(() => {
    errorLog.mockClear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('done: forwards the token to the backend and answers neutral 200 without logging an error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const res = await POST(req(JSON.stringify({ token: TOKEN })))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: TOKEN })
    expect(errorLog).not.toHaveBeenCalled()
  })

  it.each([500, 502, 429])('backend answers %i: still neutral 200, but logged as not recorded', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }))
    const res = await POST(req(JSON.stringify({ token: TOKEN })))
    expect(res.status).toBe(200)
    expect(errorLog).toHaveBeenCalledTimes(1)
    const line = String(errorLog.mock.calls[0][0])
    expect(JSON.parse(line)).toMatchObject({ event: 'crm_optout_not_recorded', reason: 'backend_status', status })
    expect(line).not.toContain(TOKEN)
  })

  it('backend unreachable: neutral 200 and logged, without the token', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const res = await POST(req(JSON.stringify({ token: TOKEN })))
    expect(res.status).toBe(200)
    const line = String(errorLog.mock.calls[0][0])
    expect(JSON.parse(line)).toMatchObject({ event: 'crm_optout_not_recorded', reason: 'backend_unreachable' })
    expect(line).not.toContain(TOKEN)
  })

  it('malformed body: neutral 200, nothing is sent to the backend', async () => {
    const res = await POST(req('not json'))
    expect(res.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
