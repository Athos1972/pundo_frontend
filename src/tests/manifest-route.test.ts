import { describe, it, expect } from 'vitest'
import { GET } from '@/app/manifest.webmanifest/route'

function makeRequest(host: string): Request {
  return new Request('http://localhost/manifest.webmanifest', {
    headers: { host },
  })
}

describe('manifest.webmanifest Route', () => {
  it('pundo.cy → Pundo-Manifest', async () => {
    const res = await GET(makeRequest('pundo.cy'))
    const body = await res.json()
    expect(body.name).toContain('Pundo')
    expect(body.short_name).toBe('Pundo')
    expect(body.theme_color).toBe('#D4622A')
  })

  it('rusky-in-cyprus.de → Rusky-Manifest', async () => {
    const res = await GET(makeRequest('rusky-in-cyprus.de'))
    const body = await res.json()
    expect(body.name).toContain('Rusky')
    expect(body.short_name).toBe('Rusky')
    expect(body.theme_color).toBe('#CC2200')
  })

  it('unbekannte Domain → Pundo-Fallback', async () => {
    const res = await GET(makeRequest('unknown.com'))
    const body = await res.json()
    expect(body.short_name).toBe('Pundo')
  })

  it('hat start_url: "/"', async () => {
    const res = await GET(makeRequest('pundo.cy'))
    const body = await res.json()
    expect(body.start_url).toBe('/')
    expect(body.display).toBe('standalone')
  })

  it('hat icons-Array', async () => {
    const res = await GET(makeRequest('pundo.cy'))
    const body = await res.json()
    expect(Array.isArray(body.icons)).toBe(true)
    expect(body.icons.length).toBeGreaterThan(0)
  })

  it('Content-Type: application/manifest+json', async () => {
    const res = await GET(makeRequest('pundo.cy'))
    expect(res.headers.get('content-type')).toContain('manifest+json')
  })

  it('www.pundo.cy → Pundo (www wird gestripped)', async () => {
    const res = await GET(makeRequest('www.pundo.cy'))
    const body = await res.json()
    expect(body.short_name).toBe('Pundo')
  })
})
