// B8950-016 (Betriebswege Frontend): Sitemap-Revalidierung und Nominatim-Proxy.
//  - /api/revalidate-sitemap wird vom Deploy (Hetzner, nicht in diesem Repo) mit dem Header x-revalidate-secret aufgerufen. Ohne
//    funktionierenden Aufruf bleibt die Sitemap nach einem Deploy veraltet; ohne Secret darf niemand den Cache leeren.
//  - /api/nominatim leitet an nominatim.openstreetmap.org weiter; die Antwort hat die Form, die LocationEditor und StepLocation lesen.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))

const fetchMock = vi.fn()
beforeEach(() => {
  vi.resetModules()
  revalidatePath.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const post = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost:3500/api/revalidate-sitemap', { method: 'POST', headers })

describe('POST /api/revalidate-sitemap', () => {
  it('refuses with 500 (not 200!) when the server has no secret configured', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '')
    const { POST } = await import('@/app/api/revalidate-sitemap/route')
    const res = await POST(post({ 'x-revalidate-secret': '' }))
    expect(res.status).toBe(500)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each<Record<string, string>>([{}, { 'x-revalidate-secret': 'wrong' }, { 'x-revalidate-secret': '' }])('refuses %j with 401 and does not touch the cache', async (headers) => {
    vi.stubEnv('REVALIDATE_SECRET', 'deploy-secret')
    const { POST } = await import('@/app/api/revalidate-sitemap/route')
    expect((await POST(post(headers))).status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates exactly the sitemap with the right secret in the header the deploy sends', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'deploy-secret')
    const { POST } = await import('@/app/api/revalidate-sitemap/route')
    const res = await POST(post({ 'x-revalidate-secret': 'deploy-secret' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revalidated: true, path: '/sitemap.xml' })
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/sitemap.xml')
  })
})

// Antwort von nominatim.openstreetmap.org/search?format=json (Form nach der Nominatim-Dokumentation; lat/lon sind TEXT)
const NOMINATIM_ANSWER = [{
  place_id: 123456, licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright', osm_type: 'way', osm_id: 98765,
  lat: '34.9167', lon: '33.6333', class: 'highway', type: 'residential', place_rank: 26, importance: 0.1, addresstype: 'road',
  name: 'Archiepiskopou Makariou III', display_name: 'Archiepiskopou Makariou III, Larnaca, Cyprus', boundingbox: ['34.91', '34.92', '33.63', '33.64'],
}]
const get = (q: string) => new NextRequest(`http://localhost:3500/api/nominatim?q=${encodeURIComponent(q)}`)

describe('GET /api/nominatim', () => {
  it.each(['', 'ab', '   a '])('answers short queries (%j) with [] without calling Nominatim', async (q) => {
    const { GET } = await import('@/app/api/nominatim/route')
    expect(await (await GET(get(q))).json()).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks Nominatim with the required User-Agent, a limit of 5 and passes the answer through unchanged', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(NOMINATIM_ANSWER), { status: 200 }))
    const { GET } = await import('@/app/api/nominatim/route')
    const res = await GET(get(' Makariou 12 Larnaca '))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(NOMINATIM_ANSWER)
    const [url, init] = fetchMock.mock.calls[0]
    const parsed = new URL(String(url))
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://nominatim.openstreetmap.org/search')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({ q: 'Makariou 12 Larnaca', format: 'json', limit: '5', addressdetails: '0' })
    expect(init.headers['User-Agent']).toMatch(/^pundo-admin\//) // Nominatim Usage Policy: identifying User-Agent
  })

  it('has the fields the editors read (lat and lon as text, display_name)', () => {
    for (const r of NOMINATIM_ANSWER) {
      expect(Number.isFinite(parseFloat(r.lat)) && Number.isFinite(parseFloat(r.lon))).toBe(true)
      expect(typeof r.display_name).toBe('string')
    }
  })

  it('forwards an HTTP error status of Nominatim with an empty list and answers 502 when Nominatim is unreachable', async () => {
    const { GET } = await import('@/app/api/nominatim/route')
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }))
    const limited = await GET(get('Larnaca centre'))
    expect(limited.status).toBe(429)
    expect(await limited.json()).toEqual([])
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const down = await GET(get('Larnaca centre'))
    expect(down.status).toBe(502)
    expect(await down.json()).toEqual([])
  })
})

// Antwort von nominatim.openstreetmap.org/reverse?format=json (gekürzt)
const NOMINATIM_REVERSE_ANSWER = { place_id: 1, lat: '34.9167', lon: '33.6333', display_name: 'Makariou III 12, Larnaca, Cyprus', address: { road: 'Makariou III' } }
const getReverse = (qs: string) => new NextRequest(`http://localhost:3500/api/nominatim?${qs}`)

describe('GET /api/nominatim (reverse: lat/lon)', () => {
  it('calls the Nominatim reverse endpoint with User-Agent and returns display_name', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(NOMINATIM_REVERSE_ANSWER), { status: 200 }))
    const { GET } = await import('@/app/api/nominatim/route')
    const res = await GET(getReverse('lat=34.9167&lon=33.6333'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ display_name: 'Makariou III 12, Larnaca, Cyprus' })
    const [url, init] = fetchMock.mock.calls[0]
    const parsed = new URL(String(url))
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://nominatim.openstreetmap.org/reverse')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({ lat: '34.9167', lon: '33.6333', format: 'json' })
    expect(init.headers['User-Agent']).toMatch(/^pundo-admin\//)
  })

  it.each([
    'lat=abc&lon=33', 'lat=34&lon=', 'lat=34', 'lon=33', 'lat=91&lon=33', 'lat=34&lon=181', 'lat=Infinity&lon=1',
  ])('rejects invalid coordinates (%s) with 400 without calling Nominatim', async (qs) => {
    const { GET } = await import('@/app/api/nominatim/route')
    const res = await GET(getReverse(qs))
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an HTTP error status and answers 502 when Nominatim is unreachable', async () => {
    const { GET } = await import('@/app/api/nominatim/route')
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }))
    expect((await GET(getReverse('lat=34&lon=33'))).status).toBe(429)
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    expect((await GET(getReverse('lat=34&lon=33'))).status).toBe(502)
  })
})
